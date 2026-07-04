import { useState } from "react";
import { useLocation } from "wouter";
import { Check, X, Zap, Music, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlan, setPlan, type Plan } from "@/lib/subscriptionService";

interface PricingFeature {
  label: string;
  free: boolean | string;
  pro: boolean | string;
}

const FEATURES: PricingFeature[] = [
  { label: "Single video download",         free: true,         pro: true },
  { label: "MP3 format",                    free: true,         pro: true },
  { label: "M4A format",                    free: true,         pro: true },
  { label: "MP4 video format",              free: false,        pro: true },
  { label: "Playlist batch download",       free: false,        pro: true },
  { label: "Concurrent downloads",          free: "1 at a time", pro: "Unlimited" },
  { label: "No upgrade banner",             free: false,        pro: true },
  { label: "Priority support",             free: false,        pro: true },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true)  return <Check className="h-4 w-4 text-green-500 mx-auto" />;
  if (value === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground font-mono">{value}</span>;
}

export default function PricingPage() {
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState<Plan>(getPlan());

  function activate(plan: Plan) {
    setPlan(plan);
    setCurrent(plan);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <Music className="w-5 h-5" />
          </div>
          <h1 className="font-bold tracking-tight text-lg">Audio Downloader</h1>
          <button
            onClick={() => navigate("/")}
            className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 flex flex-col gap-12">
        {/* Hero */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            Pricing
          </Badge>
          <h2 className="text-4xl font-bold tracking-tight">Simple, transparent plans</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start free. Upgrade when you need playlists, MP4, or unlimited downloads.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Free */}
          <PlanCard
            name="Free"
            price="$0"
            period="forever"
            description="Perfect for occasional single-track downloads."
            highlight={false}
            active={current === "free"}
            onActivate={() => activate("free")}
            cta="Use Free Plan"
            features={["Single video download", "MP3 & M4A formats", "1 download at a time"]}
          />

          {/* Pro */}
          <PlanCard
            name="Pro"
            price="$4"
            period="/ month"
            description="For power users who download playlists and want everything."
            highlight
            active={current === "pro"}
            onActivate={() => activate("pro")}
            cta="Upgrade to Pro"
            features={[
              "Everything in Free",
              "Playlist batch download",
              "MP4 video format",
              "Unlimited concurrent downloads",
              "No upgrade banner",
              "Priority support",
            ]}
          />
        </div>

        {/* Feature comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-foreground w-1/2">Feature</th>
                <th className="text-center px-4 py-3 font-semibold text-foreground w-1/4">Free</th>
                <th className="text-center px-4 py-3 font-semibold text-primary w-1/4">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.label} className={`border-b border-border/20 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 text-foreground">{f.label}</td>
                  <td className="px-4 py-3 text-center"><FeatureCell value={f.free} /></td>
                  <td className="px-4 py-3 text-center"><FeatureCell value={f.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Current plan callout */}
        {current === "pro" && (
          <div className="text-center py-4 px-6 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
            <Zap className="inline h-4 w-4 mr-1.5" />
            You're on the Pro plan. All features unlocked.
          </div>
        )}
      </main>

      <footer className="py-6 text-center border-t border-border/20">
        <p className="text-xs font-mono text-muted-foreground/40">Built with yt-dlp · FFmpeg · Express</p>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  description,
  highlight,
  active,
  onActivate,
  cta,
  features,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  highlight: boolean;
  active: boolean;
  onActivate: () => void;
  cta: string;
  features: string[];
}) {
  return (
    <Card className={`relative border flex flex-col ${highlight ? "border-primary/60 shadow-lg shadow-primary/10" : "border-border/50"}`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground font-bold text-xs px-3">Most Popular</Badge>
        </div>
      )}
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-bold">{name}</h3>
          {active && (
            <Badge variant="outline" className="border-green-500/40 text-green-500 text-[10px] font-bold uppercase">
              Active
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-extrabold tracking-tight">{price}</span>
          <span className="text-muted-foreground text-sm">{period}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </CardHeader>
      <CardContent className="px-6 pb-6 flex flex-col flex-1 gap-5">
        <ul className="space-y-2.5 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <Button
          onClick={onActivate}
          disabled={active}
          variant={highlight ? "default" : "outline"}
          className={`w-full font-semibold ${highlight ? "text-primary-foreground" : ""}`}
        >
          {active ? "Current Plan" : cta}
        </Button>
      </CardContent>
    </Card>
  );
}
