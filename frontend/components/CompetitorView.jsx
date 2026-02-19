import { motion } from "framer-motion";
import { AlertTriangle, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";


const mockCompetitor = {
  url: "gymshark.com",
  score: 86,
  categories: [
    { name: "Trust Badges", you: 0, them: 25, max: 25 },
    { name: "SSL Security", you: 20, them: 20, max: 20 },
    { name: "Contact Page", you: 0, them: 10, max: 10 },
    { name: "About Us Page", you: 0, them: 10, max: 10 },
    { name: "Return Policy", you: 0, them: 10, max: 10 },
    { name: "Privacy Policy", you: 0, them: 10, max: 10 },
    { name: "AI Design Analysis", you: 9, them: 1, max: 15 },
  ],
};


const CompetitorView = ({ yourScore, plan, auditsUsed, auditsLimit  }) => {
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [showResults, setShowResults] = useState(true);
  const isPro = plan === "PRO" || plan === "PLUS";
  const gap = mockCompetitor.score - yourScore;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Input section */}
      <div className="bg-card rounded-xl border border-border card-elevated p-6">
        <h3 className="text-base font-semibold mb-1">Trust Gap Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Compare your trust score against any competitor. ({auditsUsed}/{auditsLimit} audits used)
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="https://competitor-store.com"
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <button
            disabled={!isPro}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
              isPro
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Search className="w-4 h-4" />
            Run Competitor Audit
          </button>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <>
          {/* Gap summary */}
          <motion.div
            className="bg-destructive/5 border border-destructive/10 rounded-xl p-6 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="text-lg font-bold text-destructive">CRITICAL GAP: {gap} POINTS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You are losing ~{Math.round(gap * 0.25)}% market share to this competitor due to lower trust.
            </p>
          </motion.div>

          {/* Side by side scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border card-elevated p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Your Store</p>
              <p className="text-4xl font-extrabold font-mono">{yourScore}<span className="text-lg text-muted-foreground font-normal">/100</span></p>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${yourScore}%` }} />
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border card-elevated p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Competitor</p>
              <p className="text-4xl font-extrabold font-mono">{mockCompetitor.score}<span className="text-lg text-muted-foreground font-normal">/100</span></p>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-success" style={{ width: `${mockCompetitor.score}%` }} />
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-card rounded-xl border border-border card-elevated p-6">
            <h3 className="text-base font-semibold mb-5">Trust Gap Breakdown</h3>
            <div className="space-y-5">
              {mockCompetitor.categories.map((cat, i) => {
                const diff = cat.them - cat.you;
                const tag = diff > 0 ? `You lost ${diff} pts` : diff === 0 ? "Tie" : `You lead by ${-diff}`;
                const tagColor = diff > 0 ? "bg-destructive/10 text-destructive" : diff === 0 ? "bg-muted text-muted-foreground" : "bg-success/10 text-success";

                return (
                  <motion.div
                    key={cat.name}
                    className="bg-muted/30 rounded-lg p-4"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">{cat.name}</span>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", tagColor)}>{tag}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-12">You</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: `${(cat.you / cat.max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono w-12 text-right">{cat.you}/{cat.max}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-12">Them</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={cn(
                            "h-full rounded-full",
                            cat.name === "AI Design Analysis" ? "bg-destructive" : "bg-success"
                          )} style={{ width: `${(cat.them / cat.max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono w-12 text-right">{cat.them}/{cat.max}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Audit history */}
          <div className="bg-card rounded-xl border border-border card-elevated p-6">
            <h3 className="text-sm font-semibold mb-3">Audit History</h3>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">https://gymshark.com</span>
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono">Score: 86/100</span>
                <button className="text-xs text-primary font-medium hover:underline">View Comparison</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompetitorView;
