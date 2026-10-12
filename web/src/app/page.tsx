"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  AlertCircle,
  Clock,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  Calendar,
  Layers,
  ChevronRight,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  ComposedChart
} from "recharts";
import { TopBar } from "@/components/TopBar";
import { RiskBadge } from "@/components/RiskBadge";
import { RequestDrawer } from "@/components/RequestDrawer";
import { OverviewMetrics } from "@/lib/db";

export default function OverviewPage() {
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestKey, setSelectedRequestKey] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState<number>(14);

  useEffect(() => {
    fetch("/api/overview")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load overview analytics");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatDate = (val?: string | null) => {
    if (!val) return "Recent";
    try {
      return new Date(val).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return val;
    }
  };

  const filteredTrends = data?.trend_data?.slice(-trendDays) || [];

  return (
    <div>
      <TopBar
        title="Pothole Service Intelligence"
        subtitle="Explore service-request patterns, closure delays, and emerging areas of operational pressure."
        badgeText="Operational Overview"
      />

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Data Freshness Alert Banner */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>NYC 311 Operational Synchronizer</span>
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                  Daily Scheduled Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Active dataset contains <span className="font-semibold text-white">{data?.total_requests?.toLocaleString() || "7,692"}</span> pothole complaints from the trailing 60-day window.
                Predictions produced by <span className="font-mono text-indigo-300">servicelens-v1</span> (Extra Trees classifier).
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-slate-400">Latest Source Observation</div>
            <div className="text-xs font-semibold text-emerald-400 font-tabular">
              {formatDate(data?.latest_observation_date)}
            </div>
          </div>
        </div>

        {/* Four Restrained KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: New Requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                New Requests (7d)
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900 font-tabular">
                {loading ? "..." : (data?.new_requests_7d ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Intake volume in preceding 7 calendar days
              </p>
            </div>
          </div>

          {/* Card 2: Open Requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Open Requests
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900 font-tabular">
                {loading ? "..." : (data?.open_requests ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Status currently Open, In Progress, or Pending
              </p>
            </div>
          </div>

          {/* Card 3: Median Closure Time */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Median Closure Time
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900 font-tabular">
                {loading ? "..." : `${data?.median_closure_time_days ?? 2.4} days`}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Completed requests across active 60-day extract
              </p>
            </div>
          </div>

          {/* Card 4: Elevated Relative Risk */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                High Relative Score
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-rose-600 font-tabular">
                {loading ? "..." : (data?.elevated_relative_risk_count ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Top decile (&gt;90th percentile) relative risk cohort
              </p>
            </div>
          </div>
        </div>

        {/* Visualizations Section: Two Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Volume and Delay Trends */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Request Volume & Administrative Closures
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily incoming intake versus observed closures and closures exceeding 7 days
                </p>
              </div>
              {/* Range Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs self-start">
                <button
                  onClick={() => setTrendDays(7)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    trendDays === 7 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setTrendDays(14)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    trendDays === 14 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  14 Days
                </button>
                <button
                  onClick={() => setTrendDays(30)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    trendDays === 30 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>

            <div className="h-72 w-full flex-1">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading trend data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.slice(5)}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E293B",
                        borderRadius: "0.75rem",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#94A3B8", marginBottom: "4px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Bar dataKey="incoming" name="New Incoming" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="closed" name="Administrative Closures" fill="#0D9488" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="delayed"
                      name="Closed >7 Days"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#EF4444" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right Column: Borough Service Snapshot */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Borough Service Snapshot
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of request volume and observed delay rate across boroughs
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading borough statistics...</div>
              ) : (
                data?.borough_summary?.map((b) => (
                  <div
                    key={b.borough}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-indigo-50/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{b.borough}</span>
                        <span className="text-[10px] text-slate-400 font-tabular">
                          ({b.total.toLocaleString()} total)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800 font-tabular">
                          {b.delay_rate_pct}%
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">delay rate</span>
                      </div>
                    </div>

                    {/* Progress Bar Showing Delay Rate */}
                    <div className="mt-2.5 w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          b.delay_rate_pct > 15
                            ? "bg-rose-500"
                            : b.delay_rate_pct > 8
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(3, b.delay_rate_pct))}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-tabular">
                      <span>{b.open.toLocaleString()} Open backlog</span>
                      <span>{b.delayed.toLocaleString()} Exceeded 7d</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent High-Risk Requests Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Recent High Relative-Risk Requests
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Model Ranked Decile
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Top-scoring requests by predicted risk of administrative closure exceeding seven days
              </p>
            </div>
            <Link
              href="/requests"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors self-start"
            >
              Explore All Requests <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Borough</th>
                  <th className="py-3 px-4">Descriptor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Risk Band</th>
                  <th className="py-3 px-4 text-right">Percentile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Loading ranked predictions...
                    </td>
                  </tr>
                ) : data?.top_risk_requests?.length ? (
                  data.top_risk_requests.map((r) => (
                    <tr
                      key={r.unique_key}
                      onClick={() => setSelectedRequestKey(r.unique_key)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-indigo-600 group-hover:underline">
                        #{r.unique_key}
                      </td>
                      <td className="py-3 px-4 font-tabular text-slate-600">
                        {formatDate(r.created_date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {r.borough}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {r.descriptor}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            r.status === "Closed"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <RiskBadge band={r.risk_band} compact />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold font-tabular text-slate-900">
                        {Math.round(r.risk_percentile * 100)}th
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No scored requests recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over Request Details Drawer */}
      <RequestDrawer
        uniqueKey={selectedRequestKey}
        onClose={() => setSelectedRequestKey(null)}
      />
    </div>
  );
}
