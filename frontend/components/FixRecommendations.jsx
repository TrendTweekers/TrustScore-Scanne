import { motion } from "framer-motion";
import { AlertTriangle, Clock, DollarSign, TrendingUp, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";


const fixes = [
  {
    severity: "HIGH",
    title: "Missing Trust Signals",
    estimatedLift: "+3–7%",
    revenueImpact: "$75–$175/mo",
    fixTime: "15 mins",
    description: "Add trust badges (Visa, Mastercard, Norton) above the fold (top 900px). Use the free \"Trust Badge Builder\" app from the Shopify App Store.",
    actionLabel: "Open Trust Badge Builder",
    isPro: false,
  },
  {
    severity: "HIGH",
    title: "Missing Contact Page",
    estimatedLift: "+6–11%",
    revenueImpact: "$150–$275/mo",
    fixTime: "10 mins",
    description: "Create a page at /pages/contact with your support email, phone number, and physical address. Customers need to know you are a real business.",
    actionLabel: "Manage Pages",
    isPro: false,
  },
  {
    severity: "MEDIUM",
    title: "Missing About Us Page",
    estimatedLift: "+3–6%",
    revenueImpact: "$75–$150/mo",
    fixTime: "20 mins",
    description: "Add an About Us page with your brand story, team photo, and mission. Builds emotional connection and credibility with visitors.",
    actionLabel: "Create About Page",
    isPro: false,
  },
  {
    severity: "MEDIUM",
    title: "Missing Return Policy",
    estimatedLift: "+4–8%",
    revenueImpact: "$100–$200/mo",
    fixTime: "15 mins",
    description: "Create a clear return policy page at /pages/returns offering a 30-day money-back guarantee. This dramatically reduces purchase hesitation.",
    actionLabel: "Create Policy Page",
    isPro: false,
  },
  {
    severity: "LOW",
    title: "Missing Privacy Policy",
    estimatedLift: "+1–3%",
    revenueImpact: "$25–$75/mo",
    fixTime: "10 mins",
    description: "Add a privacy policy page. Required for GDPR compliance and builds trust with privacy-conscious shoppers.",
    actionLabel: "Create Policy",
    isPro: false,
  },
];

const FixRecommendations = () => {
  const [expandedFix, setExpandedFix] = useState(0);

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold flex items-center gap-2">
          🔥 Fix These First
          <span className="text-xs text-muted-foreground font-normal">(Highest Revenue Impact)</span>
        </h3>
      </div>

      {/* Encouragement banner */}
      <div className="bg-success/5 border border-success/10 rounded-lg p-3 mb-5">
        <p className="text-xs text-success font-medium">
          🚀 TrustScore improves FAST. Most stores reach 60+ within 7 days.
        </p>
      </div>

      <div className="space-y-3">
        {fixes.map((fix, i) => (
          <motion.div
            key={i}
            className={cn(
              "rounded-lg overflow-hidden cursor-pointer transition-all",
              fix.severity === "HIGH" ? "priority-high" : fix.severity === "MEDIUM" ? "priority-medium" : "priority-low"
            )}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 + 0.2 }}
            onClick={() => setExpandedFix(expandedFix === i ? null : i)}
          >
            <div className="p-4">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn(
                    "w-4 h-4",
                    fix.severity === "HIGH" ? "text-destructive" : fix.severity === "MEDIUM" ? "text-warning" : "text-success"
                  )} />
                  <span className="text-sm font-semibold">[{fix.severity}] {fix.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {fix.isPro && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                      Pro Insight
                    </span>
                  )}
                  {expandedFix === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Estimated Lift</p>
                    <p className="text-sm font-semibold">{fix.estimatedLift}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Revenue Impact</p>
                    <p className="text-sm font-semibold">{fix.revenueImpact}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Fix Time</p>
                    <p className="text-sm font-semibold">{fix.fixTime}</p>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedFix === i && (
                <motion.div
                  className="mt-4 pt-4 border-t border-border/50"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <p className="text-sm font-semibold text-primary mb-1">How to fix:</p>
                  <p className="text-sm text-muted-foreground mb-3">{fix.description}</p>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5" />
                    {fix.actionLabel}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FixRecommendations;
