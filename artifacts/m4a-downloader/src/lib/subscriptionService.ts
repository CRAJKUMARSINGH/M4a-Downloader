// Subscription plan state — persisted in localStorage.
// Extend this to hit a real billing API when ready.

export type Plan = "free" | "pro";

const STORAGE_KEY = "m4a_plan";
const WELCOME_SEEN_KEY = "m4a_welcome_seen";

// ─── Plan state ─────────────────────────────────────────────────────────────

export function getPlan(): Plan {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

export function setPlan(plan: Plan): void {
  try {
    localStorage.setItem(STORAGE_KEY, plan);
  } catch {
    // ignore — SSR / private browsing
  }
}

export function isPro(): boolean {
  return getPlan() === "pro";
}

// ─── Welcome modal ──────────────────────────────────────────────────────────

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // ignore
  }
}

// ─── Feature gates ──────────────────────────────────────────────────────────

export interface FeatureGates {
  /** Max simultaneous downloads (free = 1, pro = unlimited) */
  maxConcurrentDownloads: number;
  /** Playlist batch download */
  playlistDownload: boolean;
  /** MP4 video format */
  mp4Format: boolean;
  /** No upgrade banner */
  hideBanner: boolean;
}

export function getFeatureGates(): FeatureGates {
  const pro = isPro();
  return {
    maxConcurrentDownloads: pro ? Infinity : 1,
    playlistDownload: pro,
    mp4Format: pro,
    hideBanner: pro,
  };
}
