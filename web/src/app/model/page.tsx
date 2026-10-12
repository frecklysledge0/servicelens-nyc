"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter
} from "recharts";
import {
  Activity,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { TopBar } from "@/components/TopBar";

export default function ModelPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/model-performance")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <TopBar
        title="Model Evaluation"
        subtitle="How well does ServiceLens identify requests that remain administratively open beyond seven days?"
        badgeText="Model Diagnostics"
      />

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Model Status Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {data?.metadata?.model_name || "Extra Trees Classifier"}
                </h2>
                <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                  {data?.metadata?.model_version || "servicelens-v1"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Target: {data?.metadata?.target_definition}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {data?.metadata?.evaluation_status || "Experimental — prospective validation in progress"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">Training Cohort</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">2020–2024 NYC 311</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">Compatible Runtime</span>
              <span className="font-mono font-medium text-slate-800 text-sm mt-0.5 block">scikit-learn 1.5.2</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">Transformed Dimensions</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">269 pipeline features</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">Leakage Prevention</span>
              <span className="font-semibold text-emerald-700 text-sm mt-0.5 block">Strict Pre-Cutoff Lag</span>
            </div>
          </div>
        </div>

        {/* Historical Development Experiments Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Historical Development Experiments & Diagnostics
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Performance metrics across chronological rolling development folds and out-of-sample retrospective diagnostics.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Evaluation Horizon</th>
                  <th className="py-3 px-4">Evaluation Period</th>
                  <th className="py-3 px-4 text-right">PR-AUC</th>
                  <th className="py-3 px-4 text-right">ROC-AUC</th>
                  <th className="py-3 px-4 text-right">Brier Score</th>
                  <th className="py-3 px-4 text-right">Baseline Brier</th>
                  <th className="py-3 px-4">Context & Diagnostics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">Rolling Validation Folds</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">2022–2024</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold font-tabular text-indigo-600">0.2132</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold font-tabular text-slate-900">0.7359</td>
                  <td className="py-3.5 px-4 text-right font-mono font-tabular text-slate-700">0.0742</td>
                  <td className="py-3.5 px-4 text-right font-mono font-tabular text-slate-400">0.0799</td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-xs text-[11px]">
                    Chronological rolling folds across 2022–2024 development windows. Brier skill +0.0714 over prevalence baseline.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">Retrospective Fold</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">2025</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold font-tabular text-indigo-600">0.1390</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold font-tabular text-slate-900">0.6219</td>
                  <td className="py-3.5 px-4 text-right font-mono font-tabular text-slate-700">0.0892</td>
                  <td className="py-3.5 px-4 text-right font-mono font-tabular text-slate-400">0.0902</td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-xs text-[11px]">
                    Out-of-sample diagnostic fold. Slight advantage over constant baseline; shows distribution shift in complaint intake.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">Retrospective Stress Diagnostic</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">2026</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold font-tabular text-indigo-600">0.3038</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold font-tabular text-slate-900">0.5580</td>
                  <td className="py-3.5 px-4 text-right font-mono font-tabular text-slate-700">0.2035</td>
                  <td className="py-3.5 px-4 text-right font-mono font-tabular text-slate-400">0.2115</td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-xs text-[11px]">
                    Stress diagnostic period with substantial target prevalence spike (~21% delay rate). Higher PR-AUC due to high positive rate.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Critical Validation Note: </span>
              These figures come directly from historical development experiments. These periods were repeatedly inspected during model research and do not represent an untouched final test. They provide realistic benchmarks of how tree-based models encounter real-world civic distribution shifts.
            </div>
          </div>
        </div>

        {/* Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Delay Rate Trend by Year (Target Prevalence Shift) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Historical Delay Prevalence Trend (2020–2026)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Observed percentage of pothole requests taking &gt;7 days to administrative closure
              </p>
            </div>

            <div className="h-64 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.delay_rate_trend_by_year || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                  <YAxis unit="%" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1E293B", borderRadius: "0.75rem", border: "none", color: "#FFFFFF", fontSize: "12px" }}
                    formatter={(val: any) => [`${val}%`, "Delay Rate"]}
                  />
                  <Bar dataKey="delay_rate_pct" name="Observed Delay Rate" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
              Notice the massive shift between 2021 (18.2%), 2023 (4.6%), and 2026 (21.0%). Shifts in municipal closure practices dramatically alter baseline probabilities, making static calibration difficult.
            </div>
          </div>

          {/* Chart 2: Model Calibration Diagnostics */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Calibration Diagnostic (Predicted vs Observed)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mean predicted score versus observed administrative delay rate by decile
              </p>
            </div>

            <div className="h-64 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.calibration_deciles || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="decile" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1E293B", borderRadius: "0.75rem", border: "none", color: "#FFFFFF", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Line type="monotone" dataKey="observed_delay_rate" name="Observed Delay Rate" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="mean_predicted" name="Mean Predicted Score" stroke="#4F46E5" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
              The model monotonically discriminates higher risk cases (Decile 10 shows ~24.5% delay vs ~6.2% for Decile 1), but compresses scores below extreme values, affirming the decision to display relative decile bands rather than raw probabilities.
            </div>
          </div>
        </div>

        {/* Feature Importance Chart (Verified from servicelens_v1.joblib) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Model Feature Importance (Extra Trees Candidate)
              </h3>
              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                Gini Importance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Top 15 features contributing to split decisions in the deployed servicelens-v1 pipeline.
            </p>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data?.feature_importances || []}
                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                <YAxis
                  dataKey="feature"
                  type="category"
                  tick={{ fill: "#1E293B", fontSize: 11 }}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickLine={false}
                  width={170}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1E293B", borderRadius: "0.75rem", border: "none", color: "#FFFFFF", fontSize: "12px" }}
                  formatter={(val: any) => [Number(val).toFixed(4), "Importance"]}
                />
                <Bar dataKey="importance" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2">
            <div className="font-semibold text-slate-900">Key Feature Takeaways:</div>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li><b>Seasonal timing dominates:</b> Spring thaw periods (April: 0.1555, May: 0.0985) show the strongest predictive weight due to high spring freeze-thaw complaint backlogs.</li>
              <li><b>Workload lag:</b> Trailing 28-day citywide complaint volume (0.0941) and trailing 7-day volume (0.0537) are primary drivers of system capacity exhaustion.</li>
              <li><b>Borough differentials:</b> Geographic fixed effects (Bronx: 0.0573, Manhattan: 0.0481) capture differing roadway infrastructure and administrative handling patterns.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
