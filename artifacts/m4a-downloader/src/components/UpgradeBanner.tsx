import { useState } from "react";
import { useLocation } from "wouter";
import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isPro } from "@/lib/subscriptionService";

interface UpgradeBannerProps {
  /** Override to force-show the banner (e.g. when a gated action is attempted) */
  forceShow?: boolean;
}

export default function UpgradeBanner({ forceShow }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();

  // Never show to Pro users, and respect dismissal unless forced
  if (isPro()) return null;
  if (dismissed && !forceShow) return null;

  return (
    <div className="sticky top-16 z-40 w-full bg-gradient-to-r from-primary/90 via-primary to-primary/90 text-primary-foreground shadow-md">
      <div className="max-w-4xl mx-auto px-4 h-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium truncate">
          <Zap className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Unlock playlists, MP4 &amp; unlimited downloads —</span>
          <span className="sm:hidden">Go Pro for more features —</span>
          <button
            onClick={() => navigate("/pricing")}
            className="underline underline-offset-2 font-semibold hover:no-underline shrink-0"
          >
            Upgrade to Pro
          </button>
        </div>

        <button
          aria-label="Dismiss banner"
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded hover:bg-primary-foreground/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Small inline Pro badge for gated UI elements */
export function ProBadge() {
  return (
    <Badge className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border-primary/30 px-1.5 py-0">
      Pro
    </Badge>
  );
}
