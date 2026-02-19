import { BarChart3, Lock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const ScoreHistory = ({ history = [], plan = "FREE", onUpgrade }) => {
  const isPro = plan === "PRO" || plan === "PLUS";

  // Build chart data from history array (most recent last for the chart)
  const chartData = [...history]
    .reverse()
    .map((scan) => {
      const date = new Date(scan.timestamp);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: scan.score,
      };
    });

  if (!isPro) {
    return (
      <div className="bg-card rounded-xl border border-border card-elevated p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Score Trend</h3>
        </div>
        <div className="relative">
          {/* Blurred fake chart */}
          <div className="blur-sm pointer-events-none select-none opacity-50 h-40">
            <div className="flex items-end justify-between h-full gap-2 px-4">
              {[30, 35, 42, 38, 45, 52, 48, 55].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/30 rounded-t"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold mb-1">Score History</p>
              <p className="text-xs text-muted-foreground mb-3">Track your progress over time</p>
              <button
                onClick={onUpgrade}
                className="px-4 py-1.5 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                Upgrade to PRO
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="bg-card rounded-xl border border-border card-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Score Trend</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            Run at least 2 scans to see your score trend over time.
          </p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
          <p className="text-sm font-bold font-mono">{payload[0].value}/100</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Score Trend</h3>
        </div>
        <span className="text-xs text-muted-foreground">{chartData.length} scans</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(160 84% 39%)"
              strokeWidth={2.5}
              fill="url(#scoreGradient)"
              dot={{ r: 4, fill: "hsl(160 84% 39%)", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "hsl(160 84% 39%)", strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScoreHistory;
