// Approximate 9:16 UI safe-zone margins per platform, as percentages of the
// video frame (derived from published/researched px figures against a
// canonical 1080x1920 canvas). These are third-party estimates, not official
// platform specs -- TikTok's own Ads Manager docs state their real safe zone
// varies dynamically with caption length, and YouTube has no official
// published diagram at all. Treat this as a visible reference guide, not a
// pixel-perfect guarantee -- exactly why this is a passive overlay with no
// auto-enforcement.
export const PLATFORM_SAFE_ZONES = {
  tiktok: {
    label: "TikTok",
    top: 5.6,    // ~108px of 1920
    bottom: 16.7, // ~320px of 1920 (captions, username, music ticker, CTA)
    left: 5.6,   // ~60px of 1080
    right: 11.1, // ~120px of 1080 (like/comment/share/profile column)
  },
  instagram: {
    label: "Instagram Reels",
    top: 11.5,   // ~220px of 1920
    bottom: 21.9, // ~420px of 1920
    left: 6.5,   // approximate -- not separately published, matches typical Reels UI column width
    right: 12.5, // approximate -- like/comment/share/save column
  },
  facebook: {
    label: "Facebook Reels",
    // Meta cites the same safe-zone numbers for FB and IG Reels
    top: 11.5,
    bottom: 21.9,
    left: 6.5,
    right: 12.5,
  },
  youtube: {
    label: "YouTube Shorts",
    top: 9.4,    // up to ~180px of 1920 (search icon/menu at very top)
    bottom: 18.2, // ~350px of 1920 average (300-400px range depending on expanded description)
    left: 0,
    right: 6.25, // ~120px of 1080 (like/dislike/comment/share column)
  },
};

export const SAFE_ZONE_PLATFORMS = Object.keys(PLATFORM_SAFE_ZONES);
