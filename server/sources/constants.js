// Per-source brand colors used to tint the unified stream.
export const SOURCE_COLORS = {
  twitch: "#9146FF",
  kick: "#53FC18",
  x: "#FFFFFF",
};

// Normalize any source's raw payload into the single unified shape that
// every browser client consumes.
export function unifiedMessage(source, username, text, timestamp, fragments, userColor, channel, badges, userId) {
  return {
    type: "message",
    source,
    username,
    // The chatter's platform user id (Twitch user-id tag / Kick sender id) —
    // used for moderation actions without a fragile name lookup.
    userId: userId != null ? String(userId) : null,
    text,
    timestamp: timestamp ?? Date.now(),
    // Platform brand color (purple/green/white).
    color: SOURCE_COLORS[source],
    // The chatter's own name color from the source platform, when known.
    userColor: userColor || null,
    // Which channel/query this message came from (for multi-channel feeds).
    channel: channel || null,
    // Ordered text/emote pieces for inline rendering; null = render plain text.
    fragments: fragments ?? null,
    // Normalized role badges (mod, vip, sub, broadcaster, …); null = none.
    badges: badges && badges.length ? badges : null,
  };
}
