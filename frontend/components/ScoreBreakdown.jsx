import { CheckCircle2, XCircle } from "lucide-react";

const ScoreBreakdown = ({ breakdown = [] }) => {
  const defaultBreakdown = [
    { label: "Trust Badges", points: 0, maxPoints: 25, passed: false },
    { label: "SSL Security", points: 20, maxPoints: 20, passed: true },
    { label: "Contact Page", points: 0, maxPoints: 10, passed: false },
    { label: "About Us Page", points: 0, maxPoints: 10, passed: false },
    { label: "Return Policy", points: 0, maxPoints: 10, passed: false },
    { label: "Privacy Policy", points: 0, maxPoints: 10, passed: false },
  ];

  const items = breakdown.length > 0 ? breakdown : defaultBreakdown;

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      <h3 className="text-base font-semibold mb-4">Score Breakdown</h3>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={index}
            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-3">
              {item.passed ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className="text-sm">{item.label}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {item.points}/{item.maxPoints} points
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreBreakdown;