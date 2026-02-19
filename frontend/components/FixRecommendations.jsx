import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, DollarSign, TrendingUp, ExternalLink, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const getAdminUrl = () => {
  const shopDomain = new URLSearchParams(window.location.search).get('shop') || '';
  const storeName = shopDomain.replace('.myshopify.com', '');
  return storeName ? `https://admin.shopify.com/store/${storeName}` : null;
};

const defaultFixes = [
  {
    severity: "HIGH",
    title: "Missing Trust Signals",
    estimatedLift: "+3-7%",
    revenueImpact: "$75-$175/mo",
    fixTime: "15 mins",
    description: "Add trust badges (Visa, Mastercard, Norton) above the fold (top 900px). Use a free trust badge app from the Shopify App Store.",
    actionLabel: "Find Trust Badge App",
    actionUrl: "https://apps.shopify.com/search?q=trust+badges",
    isPro: false,
  },
  {
    severity: "HIGH",
    title: "Missing Contact Page",
    estimatedLift: "+6-11%",
    revenueImpact: "$150-$275/mo",
    fixTime: "10 mins",
    description: "Create a page at /pages/contact with your support email, phone number, and physical address. Customers need to know you are a real business.",
    actionLabel: "Manage Pages",
    actionPath: "/pages",
    isPro: false,
  },
  {
    severity: "MEDIUM",
    title: "Missing About Us Page",
    estimatedLift: "+3-6%",
    revenueImpact: "$75-$150/mo",
    fixTime: "20 mins",
    description: "Add an About Us page with your brand story, team photo, and mission. Builds emotional connection and credibility with visitors.",
    actionLabel: "Create About Page",
    actionPath: "/pages",
    isPro: false,
  },
  {
    severity: "MEDIUM",
    title: "Missing Return Policy",
    estimatedLift: "+4-8%",
    revenueImpact: "$100-$200/mo",
    fixTime: "15 mins",
    description: "Create a clear return policy page at /pages/returns offering a 30-day money-back guarantee. This dramatically reduces purchase hesitation.",
    actionLabel: "Edit Policies",
    actionPath: "/settings/legal",
    isPro: false,
  },
  {
    severity: "LOW",
    title: "Missing Privacy Policy",
    estimatedLift: "+1-3%",
    revenueImpact: "$25-$75/mo",
    fixTime: "10 mins",
    description: "Add a privacy policy page. Required for GDPR compliance and builds trust with privacy-conscious shoppers.",
    actionLabel: "Edit Policies",
    actionPath: "/settings/legal",
    isPro: false,
  },
];

const FixRecommendations = ({ recommendations = [], plan = "FREE", onUpgrade }) => {
  const [expandedFix, setExpandedFix] = useState(0);
  const isPro = plan === "PRO" || plan === "PLUS";
  const adminUrl = getAdminUrl();

  // Use API recommendations if available, otherwise defaults
  const fixes = recommendations.length > 0
    ? recommendations.map((rec) => ({
        severity: rec.severity || rec.priority || "MEDIUM",
        title: rec.title || rec.issue || "Trust Issue",
        estimatedLift: rec.estimatedLift || "+3-7%",
        revenueImpact: rec.revenueImpact || "$75-$175/mo",
        fixTime: rec.fixTime || "15 mins",
        description: rec.description || rec.howToFix || "",
        actionLabel: rec.actionLabel || "Fix Now",
        actionUrl: rec.actionUrl || null,
        actionPath: rec.actionPath || null,
        isPro: rec.isPro || false,
      }))
    : defaultFixes;

  const handleAction = (fix) => {
    if (fix.actionUrl) {
      window.open(fix.actionUrl, '_blank');
    } else if (fix.actionPath && adminUrl) {
      window.open(`${adminUrl}${fix.actionPath}`, '_blank');
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold flex items-center gap-2">
          Fix These First
          <span className="text-xs text-muted-foreground font-normal">(Highest Revenue Impact)</span>
        </h3>
        <span className="text-xs text-muted-foreground">{fixes.length} issues</span>
      </div>

      {/* Encouragement banner */}
      <div className="bg-success/5 border border-success/10 rounded-lg p-3 mb-5">
        <p className="text-xs text-success font-medium">
          TrustScore improves FAST. Most stores reach 60+ within 7 days of fixing top issues.
        </p>
      </div>

      <div className="space-y-3">
        {fixes.map((fix, i) => {
          const isExpanded = expandedFix === i;
          const sevUpper = (fix.severity || "MEDIUM").toUpperCase();

          return (
            <motion.div
              key={i}
              className={cn(
                "rounded-lg overflow-hidden cursor-pointer transition-all",
                sevUpper === "HIGH" ? "priority-high" : sevUpper === "MEDIUM" ? "priority-medium" : "priority-low"
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 + 0.15 }}
              onClick={() => setExpandedFix(isExpanded ? null : i)}
            >
              <div className="p-4">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn(
                      "w-4 h-4",
                      sevUpper === "HIGH" ? "text-destructive" : sevUpper === "MEDIUM" ? "text-warning" : "text-success"
                    )} />
                    <span className="text-sm font-semibold">[{sevUpper}] {fix.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fix.isPro && !isPro && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                        <Lock className="w-2.5 h-2.5" /> PRO
                      </span>
                    )}
                    {isExpanded ? (
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
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="mt-4 pt-4 border-t border-border/50"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-sm font-semibold text-primary mb-1">How to fix:</p>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{fix.description}</p>
                      {(fix.actionUrl || (fix.actionPath && adminUrl)) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(fix); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {fix.actionLabel}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FixRecommendations;
