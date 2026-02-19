import { HelpCircle, ChevronDown, ShieldCheck, Zap, Clock, CreditCard, BarChart3, Mail } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "What is TrustScore?",
    a: "TrustScore is a 0–100 rating that measures how trustworthy your Shopify store appears to first-time visitors. It's based on the same trust signals that the Baymard Institute (18,000+ users tested) found directly impact whether shoppers complete a purchase or abandon your store.",
    icon: ShieldCheck,
  },
  {
    q: "How is my score calculated?",
    a: "We analyze 8 critical trust factors: trust badges, SSL security, contact page, about us page, return policy, privacy policy, social proof, and AI design analysis. Each factor is weighted by its proven impact on conversion rates. Your total score reflects how well your store covers these trust signals compared to high-converting stores.",
    icon: BarChart3,
  },
  {
    q: "What do the severity levels mean?",
    a: "HIGH severity issues have the biggest impact on your conversions and should be fixed first — these are costing you the most sales. MEDIUM issues are important but less urgent. LOW issues are nice-to-have improvements. Each issue shows an estimated revenue impact so you can prioritize what matters most for your store.",
    icon: Zap,
  },
  {
    q: "How long does a scan take?",
    a: "A typical scan takes 30–60 seconds. We capture screenshots of your homepage and product pages, analyze trust signals, check for missing pages, and run AI analysis. You'll see your score and recommendations as soon as the scan completes.",
    icon: Clock,
  },
  {
    q: "What's the difference between FREE, PRO, and PLUS?",
    a: "FREE gives you 1 scan per month with basic scoring. PRO ($19/mo) unlocks unlimited scans, 10 AI analyses per month, weekly monitoring with email alerts, 30-day score trends, 3 competitor audits, and detailed fix recommendations with revenue impact estimates. PLUS ($49/mo) adds unlimited AI analyses, 20 competitor audits, and priority support.",
    icon: CreditCard,
  },
  {
    q: "What does the AI analysis do?",
    a: "Our AI visually examines your store's screenshots to spot trust issues that automated checks miss — like weak branding, poor layout, missing social proof near buy buttons, and design inconsistencies. Each analysis gives you specific, actionable fixes ranked by estimated revenue impact.",
    icon: Zap,
  },
  {
    q: "How often should I scan my store?",
    a: "We recommend scanning after every significant change to your store — new theme, updated pages, added products, or policy changes. PRO users get unlimited scans plus automatic weekly monitoring so you'll be alerted if your score drops. Most stores see meaningful improvement within 7 days of fixing their top 3 issues.",
    icon: Clock,
  },
  {
    q: "How accurate are the revenue estimates?",
    a: "Revenue impact estimates are based on industry conversion rate benchmarks from Baymard Institute research. They're directional rather than exact — actual results vary by store, traffic volume, and niche. However, most merchants see measurable improvement after fixing high-priority issues, and the relative ranking (which fix matters most) is reliable.",
    icon: BarChart3,
  },
  {
    q: "I need help or have a question not listed here.",
    a: "We're here to help! Email us at support and we'll get back to you within 24 hours (often much faster for PRO and PLUS users). If TrustScore doesn't surface at least 3 clear trust issues for your store, let us know and we'll review your store manually.",
    icon: Mail,
  },
];

const HelpFAQ = () => {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="space-y-5 animate-fade-up max-w-3xl">
      {/* Quick start guide */}
      <div className="bg-card rounded-xl border border-border card-elevated p-6">
        <h3 className="text-base font-semibold mb-4">Getting Started</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <p className="text-sm font-medium mb-1">Run a Scan</p>
            <p className="text-xs text-muted-foreground">Click "Run Trust Audit" to analyze your store</p>
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <p className="text-sm font-medium mb-1">Review Fixes</p>
            <p className="text-xs text-muted-foreground">Focus on HIGH severity issues first</p>
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <p className="text-sm font-medium mb-1">Rescan</p>
            <p className="text-xs text-muted-foreground">Fix issues and scan again to track improvement</p>
          </div>
        </div>
      </div>

      {/* FAQ accordion */}
      <div className="bg-card rounded-xl border border-border card-elevated p-6">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-1">
          {faqs.map((faq, i) => {
            const Icon = faq.icon;
            return (
              <div key={i} className="border-b border-border last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-left group"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <Icon className={cn(
                      "w-4 h-4 flex-shrink-0 transition-colors",
                      openFaq === i ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <span className="text-sm font-medium">{faq.q}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                    openFaq === i && "rotate-180"
                  )} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-muted-foreground pb-4 pl-7 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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
