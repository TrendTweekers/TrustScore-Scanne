import { Bell, Mail, ShieldAlert, Lock, Send, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";
import { useUmami } from "../hooks/useUmami";

const MonitoringCard = ({ plan, onUpgrade }) => {
  const isPro = plan === "PRO" || plan === "PLUS";
  const [nextReport, setNextReport] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [error, setError] = useState(null);
  const authenticatedFetch = useAuthenticatedFetch();
  const { trackEvent } = useUmami();

  useEffect(() => {
    if (!isPro) return;
    authenticatedFetch('/api/monitoring/next-report')
      .then(r => r.json())
      .then(data => {
        if (data.nextReport) {
          const d = new Date(data.nextReport);
          setNextReport(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        }
      })
      .catch(() => {});
  }, [isPro]);

  const handleSendTestReport = async () => {
    trackEvent('test_report_clicked');
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const res = await authenticatedFetch('/api/monitoring/test-email', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        trackEvent('test_report_sent', { sentTo: data.sentTo });
        setSent(true);
        setSentTo(data.sentTo);
        setTimeout(() => setSent(false), 4000);
      } else {
        trackEvent('test_report_failed', { error: data.error });
        setError(data.error || 'Failed to send');
      }
    } catch (e) {
      trackEvent('test_report_error', { error: e.message });
      setError('Failed to send report');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Monitoring & Alerts</h3>
      </div>

      <div className="space-y-3">
        {/* Weekly Trust Report */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Weekly Trust Report</p>
              <p className="text-xs text-muted-foreground">
                {isPro && nextReport ? `Next: ${nextReport}` : 'Email summary of score changes'}
              </p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold",
            isPro ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>
            {isPro ? "Active" : "PRO"}
          </span>
        </div>

        {/* Score Drop Alerts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Score Drop Alerts</p>
              <p className="text-xs text-muted-foreground">Instant email if score drops 5+</p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold",
            isPro ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>
            {isPro ? "Active" : "PRO"}
          </span>
        </div>

        {/* Success/error feedback */}
        {sent && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-success/10 text-success text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Report sent to {sentTo}</span>
          </div>
        )}
        {error && (
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}
      </div>

      {!isPro ? (
        <button
          onClick={onUpgrade}
          className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Lock className="w-3 h-3" />
          Unlock Monitoring — PRO
        </button>
      ) : (
        <button
          onClick={handleSendTestReport}
          disabled={sending || sent}
          className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
        >
          {sending ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
          ) : sent ? (
            <><CheckCircle2 className="w-3 h-3 text-success" /> Sent!</>
          ) : (
            <><Send className="w-3 h-3" /> Send Sample Report Now</>
          )}
        </button>
      )}
    </div>
  );
};

export default MonitoringCard;
