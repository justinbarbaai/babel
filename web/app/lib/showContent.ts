// Curated Market Bubble content for the /content page. Edit these arrays (or
// later wire them to a feed) — the page renders whatever's here.

export type Tweet = {
  handle: string; // "@MarketBubble"
  name?: string; // display name, e.g. "Market Bubble"
  avatar?: string; // author profile image URL
  verified?: boolean;
  date: string; // human label, e.g. "Jun 5"
  text: string;
  retweet?: boolean;
  media?: boolean; // show a media frame on the card
  thumb?: string; // image URL for the card thumbnail
  video?: string; // native mp4 URL when the post has a video
  likes?: number;
  replies?: number;
  url?: string;
};

export type Source = "twitch" | "kick";

export type Clip = {
  title: string;
  date: string;
  thumb?: string; // image URL for the clip thumbnail
  url?: string;
  source?: Source; // platform the clip came from
  duration?: string; // "1M 20S"
};

export type Stream = {
  title: string;
  date: string;
  duration: string; // "5H 16M"
  views: string; // "141.8K"
  thumb?: string; // image URL for the VOD thumbnail
  url?: string;
  source?: Source; // platform the broadcast came from
};

export const X_PROFILE = "https://x.com/MarketBubble";

export type Host = {
  name: string;
  handle: string; // without the @
  role: string;
  avatar: string;
  url: string; // X profile
  twitch?: string; // twitch channel slug
  kick?: string; // kick channel slug
  instagram?: string; // instagram handle
};

// Hosts of the show. Avatars are pulled live from X via unavatar (no API key).
export const HOSTS: Host[] = [
  {
    name: "Banks",
    handle: "Banks",
    role: "Host",
    avatar: "https://unavatar.io/twitter/Banks",
    url: "https://x.com/Banks",
    twitch: "fazebanks",
    instagram: "banks",
  },
  {
    name: "Ansem",
    handle: "blknoiz06",
    role: "Co-host",
    avatar: "https://unavatar.io/twitter/blknoiz06",
    url: "https://x.com/blknoiz06",
    kick: "ansem",
  },
];

export const TWEETS: Tweet[] = [
  {
    handle: "@MarketBubble",
    date: "Jun 5",
    text: "Ansem is up +450% in two weeks, leading the Bullpen trading comp by nearly $100k. $25K → $137K, with every trade called live on the show.",
    media: true,
  },
  {
    handle: "@MarketBubble",
    date: "Jun 5",
    text: "Mike Majlak reveals Logan Paul is already up about $20,000 on his $50,000 Knicks position before Game 1.",
    media: true,
  },
  {
    handle: "@MarketBubble",
    date: "Jun 5",
    text: "Erik Voorhees explains how Venice's dual token model works, including staking, burns, DIEM, and AI inference access.",
    media: true,
  },
  {
    handle: "@MarketBubble",
    date: "Jun 5",
    text: "Ansem called the market crash live, explaining why a break under range lows could liquidate longs and pull the market down.",
    media: true,
  },
  {
    handle: "@Jackk",
    date: "Jun 4",
    text: "Mike Majlak crashes out on FaZe Banks and Ansem after a marathon show segment.",
    retweet: true,
    media: true,
  },
  {
    handle: "@MarketBubble",
    date: "Jun 4",
    text: "Erik Voorhees talks through the censorship risk he sees coming for AI and online information access.",
    media: true,
  },
];

export const CLIPS: Clip[] = [
  { title: "Ansem is up +450% in two weeks, leading the Bullpen trading comp by nearly $100k. $25K → $137K, with every trade called live on the show.", date: "Jun 5" },
  { title: "Mike Majlak reveals Logan Paul is already up about $20,000 on his $50,000 Knicks position before Game 1.", date: "Jun 5" },
  { title: "Erik Voorhees explains how Venice's dual token model works, including staking, burns, DIEM, and AI inference access.", date: "Jun 5" },
  { title: "Ansem called the market crash live, explaining why a break under range lows could liquidate longs and pull the market down.", date: "Jun 5" },
  { title: "Erik Voorhees revisits debating SBF before FTX collapsed and the fallout that exposed the fraud.", date: "Jun 5" },
  { title: "Flood explains why he skipped Thanksgiving to buy Hyperliquid at launch and how early HYPE traded.", date: "Jun 4" },
  { title: "Mike Majlak crashes out on FaZe Banks and Ansem after a marathon show segment.", date: "Jun 4" },
];

export const STREAMS: Stream[] = [
  { title: "Let's Talk About View Botting", date: "Jun 4, 1:00 PM", duration: "5H 16M", views: "141.8K" },
  { title: "EMERGENCY MEETING", date: "May 28, 1:00 PM", duration: "39M", views: "39.6K" },
  { title: "I'm Sick of Talking About This…", date: "May 21, 1:00 PM", duration: "3H 26M", views: "172.6K" },
  { title: "So I Talked to FaZe Rain…", date: "May 14, 1:00 PM", duration: "4H 05M", views: "352.5K" },
  { title: "We need to talk…", date: "May 7, 1:00 PM", duration: "4H 18M", views: "1.1M" },
];
