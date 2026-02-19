import { Clock } from "lucide-react";

const RecentScans = ({ history = [] }) => {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Recent Scans</h3>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground">No scans yet.</p>
      ) : (
        <div className="space-y-2">
          {history.slice(0, 5).map((scan, index) => (
            <div 
              key={index}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {formatDate(scan.timestamp)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono">
                  {scan.score}/100
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentScans;
