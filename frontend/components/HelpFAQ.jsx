import { HelpCircle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "How is the TrustScore calculated?",
    a: "TrustScore analyzes 8 critical trust factors proven by Baymard Institute research (18,000+ users) to impact conversions: trust badges, SSL security, contact page, about us page, return policy, privacy policy, social proof, and AI design analysis.",
  },
  {
    q: "What does the AI analysis do?",
    a: "Claude AI visually analyzes your store's screenshots to identify trust issues that automated checks miss — like poor layout, weak branding, missing social proof near CTAs, and design inconsistencies. Each analysis gives you specific, actionable fixes with estimated impact.",
  },
  {
    q: "How often should I scan my store?",
    a: "We recommend scanning after every significant change. PRO users get unlimited scans plus automatic weekly monitoring. Most stores see meaningful improvement within 7 days of fixing their top 3 issues.",
  },
  {
    q: "What's the difference between FREE and PRO?",
    a: "FREE gives you 1 scan/month with basic scores. PRO ($19/mo) unlocks unlimited scans, 10 AI analyses/month, weekly monitoring, 30-day trends, 3 competitor scans, and detailed fix recommendations with revenue impact estimates.",
  },
  {
    q: "How accurate are the revenue estimates?",
    a: "Revenue impact estimates are based on industry conversion rate benchmarks from Baymard Institute research. Actual results vary by store, traffic, and niche — but most merchants see measurable improvement after fixing high-priority issues.",
  },
];

const HelpFAQ = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-5 animate-fade-up max-w-3xl">
      <div className="bg-card rounded-xl border border-border card-elevated p-6">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-1">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-border last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="text-sm font-medium pr-4">{faq.q}</span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform",
                  openFaq === i && "rotate-180"
                )} />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Founder trust signal */}
      <div className="bg-card rounded-xl border border-border card-elevated p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">
          Built by an independent founder. Questions? I personally reply within 24h for PRO users.
        </p>
        <p className="text-xs text-muted-foreground">
          If TrustScore doesn't show you at least 3 clear trust issues, email me and I'll review your store manually.
        </p>
      </div>
    </div>
  );
};

export default HelpFAQ;
