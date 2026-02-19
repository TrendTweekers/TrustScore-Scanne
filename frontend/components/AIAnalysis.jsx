import { motion } from "framer-motion";
import { Sparkles, Palette, Users } from "lucide-react";
import { cn } from "@/lib/utils";


const AIAnalysis = ({ plan, aiUsageCount, aiUsageLimit  }) => {
  const isPro = plan === "PRO" || plan === "PLUS";

  if (!isPro) {
    return (
      <div className="bg-card rounded-xl border border-border card-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">AI Qualitative Analysis</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h4 className="font-semibold mb-2">Unlock AI-Powered Insights</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Get Claude AI to analyze your store's screenshots and give specific, actionable trust recommendations.
          </p>
          <button className="px-6 py-2.5 rounded-lg bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity">
            Upgrade to PRO — $19/mo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">AI Qualitative Analysis</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {aiUsageCount}/{aiUsageLimit} analyses used
        </span>
      </div>

      {/* Design Professionalism */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <motion.div
          className="bg-muted/50 rounded-lg p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Design Professionalism</span>
          </div>
          <span className="text-2xl font-bold font-mono">6<span className="text-sm text-muted-foreground font-normal">/10</span></span>
        </motion.div>
        <motion.div
          className="bg-muted/50 rounded-lg p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Niche Comparison</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Compared to top stores, this site feels unfinished, lacking polished branding and clear trust cues.
          </p>
        </motion.div>
      </div>

      {/* Assessment */}
      <motion.div
        className="mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h4 className="text-sm font-semibold mb-2">Assessment</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This store has a decent foundation, but is severely lacking in essential trust signals needed to convert visitors into customers.
        </p>
      </motion.div>

      {/* Top 3 Priority Fixes */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h4 className="text-sm font-semibold mb-3">Top 3 Priority Fixes</h4>
        <div className="space-y-3">
          {[
            {
              title: "Add trust badges above the fold",
              detail: "Add Visa, Mastercard, Norton badges above fold. This is the single most impactful fix — currently 0/25 in Trust Badges.",
            },
            {
              title: "Create a contact page",
              detail: "Create /pages/contact with support email, phone, and address. Customers need to know you're a real, legitimate business.",
            },
            {
              title: "Add a return policy",
              detail: "Create /pages/returns with a 30-day money-back guarantee. This dramatically reduces purchase hesitation.",
            },
          ].map((fix, i) => (
            <div key={i} className="pl-4 border-l-2 border-primary/30">
              <p className="text-sm font-medium">{i + 1}. {fix.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fix.detail}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AIAnalysis;
