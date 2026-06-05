"use client";

// Client-side Twitch moderation via Helix, using the logged-in user's token.
// A timeout is a ban with a `duration` (seconds); a permanent ban omits it.
// Requires the moderator:manage:banned_users scope AND that the logged-in user
// actually moderates the target channel — Twitch enforces the latter.

const HELIX = "https://api.twitch.tv/helix";

async function getUserId(login: string, token: string, clientId: string): Promise<string> {
  const res = await fetch(`${HELIX}/users?login=${encodeURIComponent(login.toLowerCase())}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Couldn't look up @${login} (${res.status})`);
  const id = (await res.json())?.data?.[0]?.id;
  if (!id) throw new Error(`@${login} not found`);
  return id;
}

export async function twitchBan(opts: {
  token: string;
  clientId: string;
  moderatorId: string;
  broadcasterLogin: string;
  targetLogin: string;
  targetUserId?: string; // preferred over login lookup when known
  duration?: number; // seconds; omit for permanent ban
  reason?: string;
}): Promise<void> {
  const { token, clientId, moderatorId, broadcasterLogin, targetLogin, targetUserId, duration, reason } = opts;
  const [broadcasterId, targetId] = await Promise.all([
    getUserId(broadcasterLogin, token, clientId),
    targetUserId ? Promise.resolve(targetUserId) : getUserId(targetLogin, token, clientId),
  ]);
  const res = await fetch(
    `${HELIX}/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
    {
      method: "POST",
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { user_id: targetId, ...(duration ? { duration } : {}), ...(reason ? { reason } : {}) },
      }),
    }
  );
  if (!res.ok) {
    let msg = `Action failed (${res.status})`;
    if (res.status === 401) msg = "Re-connect Twitch to grant moderation access.";
    else if (res.status === 403) msg = `You're not a mod of #${broadcasterLogin}.`;
    else {
      try {
        const e = await res.json();
        if (e?.message) msg = e.message;
      } catch {}
    }
    throw new Error(msg);
  }
}
