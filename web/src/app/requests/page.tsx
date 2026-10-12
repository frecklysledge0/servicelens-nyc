"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { RiskBadge } from "@/components/RiskBadge";
import { RequestDrawer } from "@/components/RequestDrawer";

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [borough, setBorough] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [riskBand, setRiskBand] = useState("ALL");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (search.trim()) params.append("search", search.trim());
      if (borough !== "ALL") params.append("borough", borough);
      if (status !== "ALL") params.append("status", status);
      if (riskBand !== "ALL") params.append("risk_band", riskBand);

      const res = await fetch(`/api/requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to query requests");
      const json = await res.json();
      setRequests(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, limit, borough, status, riskBand, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const formatDate = (val?: string | null) => {
    if (!val) return "—";
    try {
      return new Date(val).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return val;
    }
  };

  return (
    <div>
      <TopBar
        title="Live Requests"
        subtitle="Operational exploration of NYC 311 pothole complaints and candidate delay risk rankings."
        badgeText={`${total.toLocaleString()} Records`}
      />

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Methodological Context Note */}
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-900 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Relative-Risk Ranking Guidance: </span>
            The percentile column represents ranking within the defined recent observation cohort.
            This is an experimental research model estimating statistical risk of administrative closure delays beyond 7 days.
            Do not interpret relative percentiles as calibrated probabilities or direct repair commitments.
          </div>
        </div>

        {/* Filters and Controls Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Request ID or ZIP code..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </form>

            {/* Borough Selector */}
            <div className="md:col-span-2">
              <select
                value={borough}
                onChange={(e) => {
                  setBorough(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="ALL">All Boroughs</option>
                <option value="BRONX">Bronx</option>
                <option value="BROOKLYN">Brooklyn</option>
                <option value="MANHATTAN">Manhattan</option>
                <option value="QUEENS">Queens</option>
                <option value="STATEN ISLAND">Staten Island</option>
              </select>
            </div>

            {/* Status Selector */}
            <div className="md:col-span-2">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Risk Band Selector */}
            <div className="md:col-span-2">
              <select
                value={riskBand}
                onChange={(e) => {
                  setRiskBand(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="ALL">All Risk Bands</option>
                <option value="High relative score">High (&gt;90th %ile)</option>
                <option value="Elevated relative score">Elevated (70-90th)</option>
                <option value="Typical relative score">Typical (&lt;70th)</option>
              </select>
            </div>

            {/* Items Per Page */}
            <div className="md:col-span-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th
                    onClick={() => handleSort("unique_key")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Request ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("created_date")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Created Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("borough")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Borough</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">ZIP</th>
                  <th className="py-3 px-4">Complaint Detail</th>
                  <th
                    onClick={() => handleSort("status")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("risk_percentile")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Relative-Risk %ile</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Model Horizon</th>
                  <th className="py-3 px-4">Evaluation Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                        <div className="font-semibold text-slate-700 text-sm">No Matching Service Requests</div>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search terms or relaxing active filters to view records.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr
                      key={r.unique_key}
                      onClick={() => setSelectedKey(r.unique_key)}
                      className="hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-indigo-600 group-hover:underline">
                        #{r.unique_key}
                      </td>
                      <td className="py-3 px-4 font-tabular text-slate-600 whitespace-nowrap">
                        {formatDate(r.created_date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {r.borough || "UNKNOWN"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {r.incident_zip || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {r.descriptor || "Pothole"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                            r.status === "Closed"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.risk_percentile !== null && r.risk_percentile !== undefined ? (
                          <RiskBadge
                            band={r.risk_band}
                            percentile={r.risk_percentile}
                            compact
                          />
                        ) : (
                          <span className="text-slate-400 text-xs">Unscored</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        7-Day Admin
                      </td>
                      <td className="py-3 px-4">
                        {r.is_prospective ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Prospective
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Demonstration
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900 font-tabular">{requests.length}</span> of{" "}
              <span className="font-semibold text-slate-900 font-tabular">{total.toLocaleString()}</span> total requests
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="px-2 font-tabular">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Request Details Drawer */}
      <RequestDrawer
        uniqueKey={selectedKey}
        onClose={() => setSelectedKey(null)}
      />
    </div>
  );
}
