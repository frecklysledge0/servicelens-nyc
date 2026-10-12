"use client";

import React, { useEffect, useState } from "react";
import { Clock, RefreshCw, CheckCircle2 } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
}

export function TopBar({ title, subtitle, badgeText }: TopBarProps) {
  const [freshness, setFreshness] = useState<{
    lastSync: string | null;
    totalRecords: number;
    status: string;
  }>({
    lastSync: null,
    totalRecords: 7692,
    status: "success",
  });
  const [loading, setLoading] = useState(false);

  const fetchFreshness = async () => {
    try {
      const res = await fetch("/api/data-freshness");
      if (res.ok) {
        const data = await res.json();
        setFreshness({
          lastSync: data.last_sync_finished || data.latest_source_observation,
          totalRecords: data.total_stored_requests || 7692,
          status: data.sync_status || "success",
        });
      }
    } catch {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    fetchFreshness();
  }, []);

  const formatSyncTime = (timestamp: string | null) => {
    if (!timestamp) return "Recent backfill";
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {badgeText && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs md:text-sm text-slate-500 mt-0.5 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Sync Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1 text-slate-500 font-tabular">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Refreshed: {formatSyncTime(freshness.lastSync)}</span>
          </div>
        </div>

        {/* Model Tag */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] font-mono text-indigo-700 font-medium">
          <span>v1.0 (Extra Trees)</span>
        </div>

        {/* Manual Refresh Trigger */}
        <button
          onClick={() => {
            setLoading(true);
            fetchFreshness().finally(() => setLoading(false));
          }}
          disabled={loading}
          title="Refresh Data State"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>
    </header>
  );
}
