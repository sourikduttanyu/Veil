import { useEffect, useState } from "react";
import { FrequencyChart } from "./components/FrequencyChart";
import { BudgetGauge } from "./components/BudgetGauge";
import { EnforcementRate } from "./components/EnforcementRate";
import { AccuracyTradeoff } from "./components/AccuracyTradeoff";
import { fetchDistribution, fetchBudgets, type Bucket, type BudgetRow } from "./api";

const DEFAULT_CAMPAIGN = import.meta.env.VITE_DEFAULT_CAMPAIGN || "camp_001";
const DEFAULT_COHORT = import.meta.env.VITE_DEFAULT_COHORT || "us-unknown-desktop";
const POLL_MS = 5000;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
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
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">privacap</h1>
          <p className="text-xs text-gray-500 mt-0.5">ε-DP frequency cap dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="bg-[#1a1a1a] border border-[#333] text-xs text-gray-300 px-2 py-1 rounded"
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
            placeholder="campaign id"
          />
          <input
            className="bg-[#1a1a1a] border border-[#333] text-xs text-gray-300 px-2 py-1 rounded"
            value={cohort}
            onChange={e => setCohort(e.target.value)}
            placeholder="cohort id"
          />
          {lastUpdated && <span className="text-xs text-gray-600">updated {lastUpdated}</span>}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Frequency Distribution">
          <FrequencyChart data={distribution} />
        </Card>
        <Card title="Privacy Budget Remaining">
          <BudgetGauge rows={budgets} />
        </Card>
        <Card title="Cap Enforcement Rate">
          <EnforcementRate served={served} suppressed={suppressed} />
        </Card>
        <Card title="ε–Accuracy Tradeoff">
          <AccuracyTradeoff />
        </Card>
      </div>

      <footer className="mt-6 text-center text-xs text-gray-700">
        True counts never leave the browser · GPL v3 ·{" "}
        <a href="https://github.com/sourikduttanyu/privacap" className="underline hover:text-gray-500" target="_blank" rel="noreferrer">
          github.com/sourikduttanyu/privacap
        </a>
      </footer>
    </div>
  );
}
