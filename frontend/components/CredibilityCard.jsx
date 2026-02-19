import { BookOpen, ExternalLink } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const methodology = [
  { factor: "Trust Badges", weight: "25 pts", source: "Baymard Institute: 18% avg lift when visible above fold" },
  { factor: "SSL Security", weight: "20 pts", source: "GlobalSign: 84% abandon without HTTPS" },
  { factor: "Contact Page", weight: "10 pts", source: "Nielsen: 44% won't buy without visible contact" },
  { factor: "About Us Page", weight: "10 pts", source: "Stanford Web Credibility: about page is a top trust signal" },
  { factor: "Return Policy", weight: "10 pts", source: "Invesp: 67% check returns page before buying" },
  { factor: "Privacy Policy", weight: "10 pts", source: "GDPR/CCPA: legally required in many markets" },
  { factor: "AI Design Analysis", weight: "15 pts", source: "Visual trust assessment by AI" },
];

const CredibilityCard = () => {
  const [showMethodology, setShowMethodology] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-5">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Credibility & Methodology</h3>
      </div>
      <ul className="space-y-2 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          Based on <strong className="text-foreground">Baymard Institute research</strong> (18,000+ users tested)
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          Analyzing <strong className="text-foreground">8 critical trust factors</strong> proven to impact conversions
        </li>
      </ul>
      <button
        onClick={() => setShowMethodology(!showMethodology)}
        className="mt-3 text-xs font-medium text-primary hover:underline"
      >
        {showMethodology ? "Hide methodology" : "View methodology"}
      </button>

      <AnimatePresence>
        {showMethodology && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {methodology.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.factor}</p>
                    <p className="text-muted-foreground truncate">{item.source}</p>
                  </div>
                  <span className="font-mono text-muted-foreground flex-shrink-0">{item.weight}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CredibilityCard;
