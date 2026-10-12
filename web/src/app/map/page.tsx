"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Layers,
  MapPin,
  Filter,
  Eye,
  Info,
  ShieldAlert,
  Compass,
  AlertTriangle,
  Building
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { RequestDrawer } from "@/components/RequestDrawer";

// Dynamically load Leaflet map component with ssr: false
const MapComponent = dynamic(
  () => import("@/components/MapComponent").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Mounting geospatial layers...</span>
      </div>
    ),
  }
);

export default function SpatialExplorerPage() {
  const [points, setPoints] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<{
    total_requests: number;
    geocoded_count: number;
    missing_coords_count: number;
    coverage_pct: number;
  }>({
    total_requests: 0,
    geocoded_count: 0,
    missing_coords_count: 0,
    coverage_pct: 0,
  });

  const [loading, setLoading] = useState(true);
  const [borough, setBorough] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [riskBand, setRiskBand] = useState("ALL");
  const [viewMode, setViewMode] = useState<"risk" | "volume">("risk");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (borough !== "ALL") params.append("borough", borough);
      if (status !== "ALL") params.append("status", status);
      if (riskBand !== "ALL") params.append("risk_band", riskBand);

      const res = await fetch(`/api/map?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load map data");
      const json = await res.json();
      setPoints(json.points || []);
      setCoverage(json.coverage || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, [borough, status, riskBand]);

  return (
    <div>
      <TopBar
        title="Spatial Explorer"
        subtitle="Geographic distribution of NYC pothole requests and localized relative delay risk."
        badgeText={`${points.length} Geocoded Points`}
      />

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Coverage & Responsible Geocoding Notice */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Geospatial Coordinate Coverage
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  <span className="font-tabular">{coverage.geocoded_count?.toLocaleString()}</span> of{" "}
                  <span className="font-tabular">{coverage.total_requests?.toLocaleString()}</span> records geocoded (
                  <span className="text-indigo-600 font-tabular">{coverage.coverage_pct}%</span> coverage)
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 hidden sm:block">
              <div>Missing coordinates: <span className="font-bold font-tabular text-slate-700">{coverage.missing_coords_count?.toLocaleString()}</span></div>
              <div className="text-[11px] text-slate-400">Included in borough aggregates</div>
            </div>
          </div>

          <div className="md:col-span-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <span className="font-semibold">Coverage Integrity: </span>
              Coordinates are rendered directly from NYC 311 agency entries. No synthetic or interpolated coordinates are generated.
            </div>
          </div>
        </div>

        {/* Map Controls & Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setViewMode("risk")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "risk"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Relative Delay Risk
              </button>
              <button
                onClick={() => setViewMode("volume")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "volume"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Status / Intake
              </button>
            </div>

            {/* Borough Filter */}
            <select
              value={borough}
              onChange={(e) => setBorough(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800"
            >
              <option value="ALL">All Boroughs</option>
              <option value="BRONX">Bronx</option>
              <option value="BROOKLYN">Brooklyn</option>
              <option value="MANHATTAN">Manhattan</option>
              <option value="QUEENS">Queens</option>
              <option value="STATEN ISLAND">Staten Island</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open Only</option>
              <option value="Closed">Closed Only</option>
              <option value="In Progress">In Progress</option>
            </select>

            {/* Risk Band Filter */}
            <select
              value={riskBand}
              onChange={(e) => setRiskBand(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800"
            >
              <option value="ALL">All Risk Bands</option>
              <option value="High relative score">High Relative Score</option>
              <option value="Elevated relative score">Elevated Relative Score</option>
              <option value="Typical relative score">Typical Relative Score</option>
            </select>
          </div>

          {/* Interactive Legend */}
          <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            {viewMode === "risk" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                  <span className="text-slate-700 font-medium text-[11px]">High Risk (&gt;90th)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                  <span className="text-slate-700 font-medium text-[11px]">Elevated (70-90th)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 ring-2 ring-teal-200" />
                  <span className="text-slate-700 font-medium text-[11px]">Typical (&lt;70th)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span className="text-slate-700 font-medium text-[11px]">Open Intake</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-slate-700 font-medium text-[11px]">Closed</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs relative">
          <MapComponent
            points={points}
            onSelectPoint={(key) => setSelectedKey(key)}
            viewMode={viewMode}
          />

          <div className="mt-2 px-3 py-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Click any marker to open administrative details drawer</span>
            <span>Basemap: &copy; OpenStreetMap contributors</span>
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
