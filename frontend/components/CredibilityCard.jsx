import { BookOpen } from "lucide-react";

const CredibilityCard = () => {
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
      <button className="mt-3 text-xs font-medium text-primary hover:underline">
        View methodology →
      </button>
    </div>
  );
};

export default CredibilityCard;
