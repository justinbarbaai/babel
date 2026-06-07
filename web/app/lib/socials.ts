// Per-platform profile data for the host social hover cards (X / Instagram /
// Twitch / Kick). Used on the lobby + content pages and in the promo demo.
//
// Follower counts here are CURATED (static), not live — live counts would need
// each platform's API (X + Twitch are feasible; Instagram/Kick are not without
// business tokens). Easy to swap for live data later.

export type SocialPlatform = "x" | "instagram" | "twitch" | "kick";

export interface SocialProfile {
  platform: SocialPlatform;
  handle: string;
  name: string;
  url: string;
  avatar: string;
  followers: string;
  posts?: string; // instagram-style extra stat
  bio: string;
  verified?: boolean;
}

// Keyed by the host's handle (HOSTS[i].handle).
export const HOST_SOCIALS: Record<string, SocialProfile[]> = {
  Banks: [
    {
      platform: "x",
      handle: "Banks",
      name: "FaZe Banks",
      url: "https://x.com/Banks",
      avatar: "https://unavatar.io/twitter/Banks",
      followers: "1.1M",
      bio: "Co-owner @FaZeClan. Markets & mayhem on @MarketBubble.",
      verified: true,
    },
    {
      platform: "instagram",
      handle: "banks",
      name: "Ricky Banks",
      url: "https://instagram.com/banks",
      avatar: "https://unavatar.io/instagram/banks",
      followers: "1.4M",
      posts: "612",
      bio: "FaZe Banks 🖤",
    },
    {
      platform: "twitch",
      handle: "fazebanks",
      name: "FaZeBanks",
      url: "https://twitch.tv/fazebanks",
      avatar: "https://unavatar.io/twitch/fazebanks",
      followers: "1.2M",
      bio: "Just Chatting + markets · live Thursdays on Market Bubble",
    },
  ],
  blknoiz06: [
    {
      platform: "x",
      handle: "blknoiz06",
      name: "Ansem",
      url: "https://x.com/blknoiz06",
      avatar: "https://unavatar.io/twitter/blknoiz06",
      followers: "730K",
      bio: "trader. co-host @MarketBubble. not financial advice.",
      verified: true,
    },
    {
      platform: "kick",
      handle: "ansem",
      name: "ansem",
      url: "https://kick.com/ansem",
      avatar: "https://unavatar.io/kick/ansem",
      followers: "95K",
      bio: "live crypto + markets",
    },
  ],
};
