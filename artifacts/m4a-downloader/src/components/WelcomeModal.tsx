import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Music, Zap, List, Video, Download } from "lucide-react";
import { hasSeenWelcome, markWelcomeSeen } from "@/lib/subscriptionService";

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!hasSeenWelcome()) {
      // small delay so the page renders first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    markWelcomeSeen();
    setOpen(false);
  }

  function goToPricing() {
    markWelcomeSeen();
    setOpen(false);
    navigate("/pricing");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border/60 p-0 overflow-hidden gap-0">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-8 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Music className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to Audio Downloader
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Download any YouTube audio in seconds — free, no account needed.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="px-8 py-5 space-y-3">
          <FeatureRow icon={<Download className="w-4 h-4" />} label="Single video downloads" free />
          <FeatureRow icon={<Music className="w-4 h-4" />} label="MP3 &amp; M4A formats" free />
          <FeatureRow icon={<List className="w-4 h-4" />} label="Playlist batch downloads" pro />
          <FeatureRow icon={<Video className="w-4 h-4" />} label="MP4 video format" pro />
          <FeatureRow icon={<Zap className="w-4 h-4" />} label="Unlimited concurrent downloads" pro />
        </div>

        {/* CTAs */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <Button onClick={goToPricing} className="w-full font-semibold text-primary-foreground">
            <Zap className="mr-2 h-4 w-4" />
            See Pro Plans
          </Button>
          <Button variant="ghost" onClick={dismiss} className="w-full text-muted-foreground hover:text-foreground">
            Continue with Free
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureRow({
  icon,
  label,
  free,
  pro,
}: {
  icon: React.ReactNode;
  label: string;
  free?: boolean;
  pro?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="flex-1 text-foreground" dangerouslySetInnerHTML={{ __html: label }} />
      {free && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          Free
        </span>
      )}
      {pro && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full">
          Pro
        </span>
      )}
    </div>
  );
}
