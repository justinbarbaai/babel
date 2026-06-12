import { execFile } from "node:child_process";

// Combined live viewer counts across platforms. Kick counts come free from the
// same public channel API we already use for chat; Twitch counts need a Helix
// app token (TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET). X has no public live
// viewer count, so it's omitted from the total.

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

let twitchToken = null;
let twitchTokenExp = 0;

export async function getTwitchToken(clientId, clientSecret) {
  if (twitchToken && Date.now() < twitchTokenExp) return twitchToken;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Twitch token request failed (${res.status})`);
  const j = await res.json();
  twitchToken = j.access_token;
  twitchTokenExp = Date.now() + Math.max(0, (j.expires_in || 3600) - 60) * 1000;
  return twitchToken;
}

async function twitchViewers(channels, clientId, clientSecret) {
  const out = {};
  if (!channels.length) return out;
  for (const c of channels) out[c.toLowerCase()] = { live: false, viewers: 0 };
  if (!clientId || !clientSecret) return out;
  const token = await getTwitchToken(clientId, clientSecret);
  const qs = channels.map((c) => `user_login=${encodeURIComponent(c)}`).join("&");
  const res = await fetch(`https://api.twitch.tv/helix/streams?${qs}`, {
    headers: { "Client-ID": clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // A stale token (401) clears the cache so the next poll re-mints one.
    if (res.status === 401) twitchToken = null;
    throw new Error(`Twitch streams request failed (${res.status})`);
  }
  const j = await res.json();
  for (const s of j.data || []) {
    out[String(s.user_login).toLowerCase()] = {
      live: true,
      viewers: Number(s.viewer_count) || 0,
    };
  }
  return out;
}

// ---- Kick official API (app token): datacenter-safe — kick.com's site API
// is Cloudflare-blocked from hosts like Render, so prefer this and fall back
// to the curl scrape only when app creds are missing or the call fails.
let kickAppToken = null; // { token, expiresAt }
async function kickAppAccessToken() {
  const id = process.env.KICK_CLIENT_ID;
  const secret = process.env.KICK_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (kickAppToken && Date.now() < kickAppToken.expiresAt - 60000) return kickAppToken.token;
  try {
    const res = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    kickAppToken = { token: j.access_token, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
    return kickAppToken.token;
  } catch {
    return null;
  }
}

async function kickViewersOfficial(slug) {
  const token = await kickAppAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.kick.com/public/v1/channels?slug=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const ch = Array.isArray(j?.data) ? j.data[0] : null;
    const s = ch?.stream;
    if (!s) return null;
    return { live: Boolean(s.is_live), viewers: s.is_live ? Number(s.viewer_count) || 0 : 0 };
  } catch {
    return null;
  }
}

async function kickViewers(slug) {
  const official = await kickViewersOfficial(slug);
  if (official) return official;
  return kickViewersScrape(slug);
}

function kickViewersScrape(slug) {
  const url = `https://kick.com/api/v2/channels/${slug}`;
  return new Promise((resolve) => {
    execFile(
      "curl",
      ["-s", "--http1.1", "--max-time", "10", "-A", BROWSER_UA, "-H", "Accept: application/json", url],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout || !stdout.trim()) {
          resolve({ live: false, viewers: 0 });
          return;
        }
        try {
          const j = JSON.parse(stdout);
          const ls = j?.livestream;
          resolve(ls ? { live: true, viewers: Number(ls.viewer_count) || 0 } : { live: false, viewers: 0 });
        } catch {
          resolve({ live: false, viewers: 0 });
        }
      }
    );
  });
}

// (fetchXViews — the paid recent-search impressions sum — is gone: impressions
// aren't viewers. The X number now comes only from the X Bridge's live count.)

// ---- X (Twitter) live broadcast concurrent viewers ----
// X's native "Live" broadcasts run on the old Periscope backend. The official
// paid API does NOT expose concurrent viewers, but the web client's free guest
// auth does: broadcasts/show.json returns `total_watching` (live concurrent
// viewers). We resolve a handle -> user id -> current live broadcast id, then
// read that count. All undocumented/web-internal, so every step degrades to
// null on failure (the dashboard just hides the pill).
const X_AUTH =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const X_BEARER = "Bearer " + decodeURIComponent(X_AUTH);
// GraphQL query ids rotate when X ships web changes; if lookups start 404ing
// these are the first thing to refresh (from the x.com web bundle).
const Q_USER_BY_NAME = "G3KGOASz96M-Qu0nwmGXNg/UserByScreenName";
const Q_USER_TWEETS = "E3opETHurmVJflFsUBVuUQ/UserTweets";
const X_USER_FEATURES = {
  hidden_profile_subscriptions_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
  subscriptions_feature_can_gift_premium: true,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
};
const X_TWEET_FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

let xGuestToken = null;
let xGuestExp = 0;
const xUserIdCache = new Map();

async function getXGuestToken() {
  if (xGuestToken && Date.now() < xGuestExp) return xGuestToken;
  const res = await fetch("https://api.x.com/1.1/guest/activate.json", {
    method: "POST",
    headers: { Authorization: X_BEARER, "User-Agent": BROWSER_UA },
  });
  if (!res.ok) throw new Error(`X guest token failed (${res.status})`);
  const j = await res.json();
  if (!j.guest_token) throw new Error("X guest token missing");
  xGuestToken = j.guest_token;
  xGuestExp = Date.now() + 60 * 60 * 1000; // ~1h; cleared early on any error.
  return xGuestToken;
}

function xGraphqlHeaders(gt) {
  return {
    Authorization: X_BEARER,
    "User-Agent": BROWSER_UA,
    "x-guest-token": gt,
    "Content-Type": "application/json",
  };
}

// Guest tokens silently go stale (X starts 403ing) well before our 1h cache
// window. So on a 401/403 we drop the cached token, mint a fresh one, and retry
// once — that turns the common transient failure into a self-heal.
async function xGuestFetch(url, extraHeaders) {
  let gt = await getXGuestToken();
  const build = (t) => ({ ...extraHeaders, "x-guest-token": t });
  let res = await fetch(url, { headers: build(gt) });
  if (res.status === 401 || res.status === 403) {
    xGuestToken = null;
    gt = await getXGuestToken();
    res = await fetch(url, { headers: build(gt) });
  }
  return res;
}

function xGraphqlUrl(endpoint, variables, features) {
  return `https://x.com/i/api/graphql/${endpoint}?variables=${encodeURIComponent(
    JSON.stringify(variables)
  )}&features=${encodeURIComponent(JSON.stringify(features))}`;
}

const X_JSON_HEADERS = { Authorization: X_BEARER, "User-Agent": BROWSER_UA, "Content-Type": "application/json" };
const X_REST_HEADERS = { Authorization: X_BEARER, "User-Agent": BROWSER_UA };

// handle -> numeric user id (rest_id). Cached; also returns the raw payload so
// the caller can scan it for a live broadcast (live ring data lives here too).
async function xResolveUser(handle) {
  const url = xGraphqlUrl(
    Q_USER_BY_NAME,
    { screen_name: handle, withSafetyModeUserFields: true },
    X_USER_FEATURES
  );
  const res = await xGuestFetch(url, X_JSON_HEADERS);
  if (!res.ok) throw new Error(`X user lookup failed (${res.status})`);
  const text = await res.text();
  let restId = null;
  try {
    restId = JSON.parse(text)?.data?.user?.result?.rest_id || null;
  } catch {}
  if (restId) xUserIdCache.set(handle.toLowerCase(), restId);
  return { restId, text };
}

async function xTimelineText(restId) {
  const url = xGraphqlUrl(
    Q_USER_TWEETS,
    {
      userId: restId,
      count: 20,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: false,
      withVoice: false,
      withV2Timeline: true,
    },
    X_TWEET_FEATURES
  );
  const res = await xGuestFetch(url, X_JSON_HEADERS);
  if (!res.ok) throw new Error(`X timeline failed (${res.status})`);
  return res.text();
}

function scanBroadcastIds(text) {
  const ids = new Set();
  for (const m of String(text).matchAll(/broadcasts\/(\w{6,})/g)) ids.add(m[1]);
  return [...ids];
}

async function xBroadcasts(ids) {
  if (!ids.length) return [];
  const url = `https://api.x.com/1.1/broadcasts/show.json?ids=${ids
    .map(encodeURIComponent)
    .join(",")}`;
  const res = await xGuestFetch(url, X_REST_HEADERS);
  if (!res.ok) throw new Error(`X broadcast show failed (${res.status})`);
  const j = await res.json();
  return Object.values(j?.broadcasts || {});
}

// Viewer stats for a handle's current X broadcast. `viewers` is live concurrent
// viewers (total_watching); `views` is the cumulative "views" number X shows on
// the broadcast (total_watched). Returns null when no handle is set, otherwise
// always an object — live:false when nothing is currently broadcasting.
export async function fetchXLive(handle) {
  const h = String(handle || "").trim().replace(/^@/, "");
  if (!h) return null;
  const offline = { handle: h, live: false, viewers: 0, views: 0, updatedAt: Date.now() };
  try {
    const { restId, text: userText } = await xResolveUser(h);
    if (!restId) return offline;

    // Collect candidate broadcast ids from the profile payload and the recent
    // timeline (a live broadcast surfaces in one or the other), then ask the
    // Periscope endpoint which — if any — is actually running.
    let ids = scanBroadcastIds(userText);
    const timeline = await xTimelineText(restId).catch(() => "");
    ids = [...new Set([...ids, ...scanBroadcastIds(timeline)])];
    if (!ids.length) return offline;

    const broadcasts = await xBroadcasts(ids);
    const live = broadcasts.find((b) => String(b?.state || "").toUpperCase() === "RUNNING");
    if (!live) return offline;
    return {
      handle: h,
      live: true,
      viewers: Number(live.total_watching) || 0,
      views: Number(live.total_watched) || 0,
      broadcastId: live.id || null,
      title: live.status || null,
      updatedAt: Date.now(),
    };
  } catch (err) {
    // A rotated query id (404) or other hard failure — clear the token so the
    // next poll re-mints, and surface the error to the caller's warn log.
    xGuestToken = null;
    throw err;
  }
}

// Build a viewer-count snapshot for the current config. Never throws — a failing
// platform just reports zero/offline so the rest of the total still shows.
export async function fetchViewerSnapshot(config, twitchCreds = {}) {
  const twitchList = config.twitchChannels || [];
  const kickList = config.kickChannels || [];

  const twitchMap = await twitchViewers(
    twitchList,
    twitchCreds.clientId,
    twitchCreds.clientSecret
  ).catch(() => ({}));

  const kickResults = await Promise.all(kickList.map((c) => kickViewers(c)));

  const channels = [];
  let twitchTotal = 0;
  let kickTotal = 0;

  for (const c of twitchList) {
    const info = twitchMap[c.toLowerCase()] || { live: false, viewers: 0 };
    twitchTotal += info.viewers;
    channels.push({ source: "twitch", channel: c, live: info.live, viewers: info.viewers });
  }
  for (let i = 0; i < kickList.length; i++) {
    const info = kickResults[i] || { live: false, viewers: 0 };
    kickTotal += info.viewers;
    channels.push({ source: "kick", channel: kickList[i], live: info.live, viewers: info.viewers });
  }

  return {
    channels,
    totals: { twitch: twitchTotal, kick: kickTotal, total: twitchTotal + kickTotal },
    twitchEnabled: Boolean(twitchCreds.clientId && twitchCreds.clientSecret),
    updatedAt: Date.now(),
  };
}
