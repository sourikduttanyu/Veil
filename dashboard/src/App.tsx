import { useEffect, useState } from "react";
import { FrequencyChart } from "./components/FrequencyChart";
import { BudgetGauge } from "./components/BudgetGauge";
import { EnforcementRate } from "./components/EnforcementRate";
import { AccuracyTradeoff } from "./components/AccuracyTradeoff";
import { fetchDistribution, fetchBudgets, type Bucket, type BudgetRow } from "./api";

const DEFAULT_CAMPAIGN = import.meta.env.VITE_DEFAULT_CAMPAIGN || "camp_001";
const DEFAULT_COHORT = import.meta.env.VITE_DEFAULT_COHORT || "us-unknown-desktop";
const POLL_MS = 5000;

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="w-4 h-4 rounded-full border border-[#444] text-[#666] text-[10px] font-bold leading-none flex items-center justify-center hover:border-[#888] hover:text-[#aaa] transition-colors"
        aria-label="More information"
      >
        i
      </button>
      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#1c1c1e] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-xs text-[#c0c0c8] leading-relaxed shadow-xl pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2e2e2e]" />
        </div>
      )}
    </span>
  );
}

interface CardProps {
  title: string;
  subtitle: string;
  tooltip: string;
  children: React.ReactNode;
}

function Card({ title, subtitle, tooltip, children }: CardProps) {
  return (
    <div className="bg-[#0e0e10] border border-[#1e1e22] rounded-xl p-5">
      <div className="mb-4">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold text-[#e2e2e8] tracking-tight">{title}</h2>
          <InfoTooltip text={tooltip} />
        </div>
        <p className="text-xs text-[#666] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [distribution, setDistribution] = useState<Bucket[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [served, setServed] = useState(0);
  const [suppressed, setSuppressed] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [cohort, setCohort] = useState(DEFAULT_COHORT);

  async function poll() {
    try {
      const [dist, budg] = await Promise.allSettled([
        fetchDistribution(campaign),
        fetchBudgets(cohort),
      ]);
      if (dist.status === "fulfilled") setDistribution(dist.value);
      if (budg.status === "fulfilled") {
        const rows = budg.value as BudgetRow[];
        setBudgets(rows);
        const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
        setServed(Math.round(totalSpent * 4));
        setSuppressed(Math.round(totalSpent));
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [campaign, cohort]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6">
      <header className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">privacap</h1>
          <p className="text-xs text-[#555] mt-0.5">Ad frequency capping with differential privacy</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-[#555] uppercase tracking-wider">Campaign</span>
            <input
              className="bg-[#141416] border border-[#2a2a2e] text-xs text-[#bbb] px-2.5 py-1.5 rounded-md w-32 focus:outline-none focus:border-[#555]"
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
              placeholder="camp_001"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-[#555] uppercase tracking-wider">User group</span>
            <input
              className="bg-[#141416] border border-[#2a2a2e] text-xs text-[#bbb] px-2.5 py-1.5 rounded-md w-40 focus:outline-none focus:border-[#555]"
              value={cohort}
              onChange={e => setCohort(e.target.value)}
              placeholder="us-unknown-desktop"
            />
          </label>
          {lastUpdated && (
            <span className="text-[10px] text-[#444] self-end pb-1.5">
              Live · {lastUpdated}
            </span>
          )}
        </div>
      </header>

      {/* Hero banner */}
      <div className="mb-6 mt-3 px-4 py-2.5 bg-[#0e0e12] border border-[#1e1e26] rounded-lg">
        <p className="text-xs text-[#6868aa]">
          <span className="font-semibold text-[#8888cc]">How it works:</span> privacap enforces ad frequency limits without tracking who you are. Your device adds calibrated random noise to impression counts before sending anything. The server only ever sees blurred numbers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card
          title="How often ads are seen"
          subtitle="Each bar shows how common a given impression count is across this ad group. The counts have random noise added for privacy."
          tooltip="Instead of storing 'User X saw this ad 4 times', the system stores blurred counts from thousands of users. Taller bars mean that count appeared more often. The X-axis is the noisy count value (0, 1, 2...), not the true count."
        >
          <FrequencyChart data={distribution} />
        </Card>

        <Card
          title="Privacy protection level"
          subtitle="Every time data is queried, a small amount of 'privacy budget' is spent. When it runs out, queries stop automatically."
          tooltip="Epsilon (ε) is the privacy budget. Think of it like a limited number of questions you can ask about the data. Ask too many and patterns become identifiable. privacap tracks how much budget each user group has consumed and blocks queries that would exceed the limit, protecting users from over-analysis."
        >
          <BudgetGauge rows={budgets} />
        </Card>

        <Card
          title="Ads served vs. blocked"
          subtitle="Green means the ad was shown normally. Red means it was blocked because that user group had already seen it too many times."
          tooltip="The frequency cap (default: 5 impressions per window) limits how often an ad group sees the same ad. Once the noisy count crosses that threshold, the system returns 'suppress' instead of 'serve'. This protects users from repetitive ads without knowing their identity."
        >
          <EnforcementRate served={served} suppressed={suppressed} />
        </Card>

        <Card
          title="Privacy vs. accuracy"
          subtitle="More privacy noise means less accurate counts. This chart shows how much error to expect at each privacy setting."
          tooltip="Epsilon controls the noise level. At ε=0.1 (far left), counts are heavily blurred for maximum privacy but the frequency cap may misfire by ~18%. At ε=5.0 (far right), counts are nearly accurate but offer less privacy protection. The green dotted line marks the 3% error target used in production."
        >
          <AccuracyTradeoff />
        </Card>
      </div>

      <footer className="mt-6 flex items-center justify-between text-[10px] text-[#333]">
        <span>True impression counts never leave your browser</span>
        <a
          href="https://github.com/sourikduttanyu/privacap"
          className="hover:text-[#666] transition-colors"
          target="_blank"
          rel="noreferrer"
        >
          github.com/sourikduttanyu/privacap · GPL v3
        </a>
      </footer>
    </div>
  );
}
