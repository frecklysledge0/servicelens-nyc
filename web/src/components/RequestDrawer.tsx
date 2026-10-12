"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  ExternalLink,
  Calendar,
  MapPin,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  Hash,
  Activity,
  Layers
} from "lucide-react";
import { RiskBadge } from "./RiskBadge";

interface RequestDrawerProps {
  uniqueKey: string | null;
  onClose: () => void;
}

export function RequestDrawer({ uniqueKey, onClose }: RequestDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uniqueKey) return;
    setLoading(true);
    setError(null);

    fetch(`/api/requests/${uniqueKey}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request not found");
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
  }, [uniqueKey]);

  if (!uniqueKey) return null;

  const formatDate = (val?: string | null) => {
    if (!val) return "Not recorded";
    try {
      return new Date(val).toLocaleString("en-US", {
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-sm">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight font-mono">
                  #{uniqueKey}
                </h2>
                <a
                  href={`https://portal.311.nyc.gov/check-status/?service_request_id=${uniqueKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                >
                  Portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">
                NYC 311 Pothole Service Record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500">Loading request metadata & inferences...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <div className="font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Unable to retrieve record
              </div>
              <p className="mt-1 text-xs text-rose-700">{error}</p>
            </div>
          )}

          {data && (
            <>
              {/* Relative Risk Score Highlight Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-900">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Relative Delay Risk Analysis
                  </div>
                  <RiskBadge
                    band={data.risk_band}
                    percentile={data.risk_percentile}
                    score={data.raw_model_score}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[11px] font-medium text-slate-500">Cohort Relative Percentile</div>
                    <div className="text-2xl font-bold text-slate-900 font-tabular mt-0.5">
                      {data.risk_percentile !== null && data.risk_percentile !== undefined
                        ? `${Math.round(data.risk_percentile * 100)}%`
                        : "N/A"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Relative to recent prediction cohort
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[11px] font-medium text-slate-500">Raw Model Score</div>
                    <div className="text-2xl font-bold text-slate-900 font-tabular mt-0.5 font-mono">
                      {data.raw_model_score ? Number(data.raw_model_score).toFixed(4) : "N/A"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Extra Trees candidate output
                    </div>
                  </div>
                </div>

                {/* Responsible Disclaimer Notice */}
                <div className="mt-3 p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Relative ranking note: </span>
                    Scores reflect historical statistical association with closures exceeding 7 days,
                    not calibrated physical repair probabilities or causal city agency performance.
                  </div>
                </div>
              </div>

              {/* Status and Temporal Facts */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Operational Status & Timeline
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 divide-y divide-slate-200/70 text-sm">
                  <div className="pb-3 flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Current Reported Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      data.status === "Closed"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {data.status || "Unknown"}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-slate-500 text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Created Date
                    </span>
                    <span className="font-tabular font-medium text-slate-900 text-xs">
                      {formatDate(data.created_date)}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-slate-500 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Closed Date
                    </span>
                    <span className="font-tabular font-medium text-slate-900 text-xs">
                      {formatDate(data.closed_date)}
                    </span>
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Administrative Agency</span>
                    <span className="font-medium text-slate-900 text-xs">
                      {data.agency || "DOT (Department of Transportation)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Descriptor */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Location & Classification
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 text-xs">Complaint Type</span>
                    <span className="font-semibold text-slate-900 text-xs text-right">
                      {data.complaint_type || "Street Condition"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 text-xs">Descriptor</span>
                    <span className="font-medium text-slate-900 text-xs text-right">
                      {data.descriptor || "Pothole"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                    <span className="text-slate-500 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Borough & ZIP
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {data.borough} · {data.incident_zip || "Unspecified"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Geocoded Coordinates</span>
                    <span className="font-mono text-[11px] text-slate-700 font-tabular">
                      {data.latitude && data.longitude
                        ? `${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}`
                        : "Coordinates missing from agency record"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ML Feature Inputs & Provenance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Model Inference Provenance
                  </h3>
                  <Link
                    href="/model"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View Model Diagnostics →
                  </Link>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Model Pipeline</span>
                    <span className="font-mono text-slate-900 font-semibold">{data.model_version || "servicelens-v1"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Scored Timestamp</span>
                    <span className="font-tabular text-slate-900">{formatDate(data.scored_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Feature Cutoff Time</span>
                    <span className="font-tabular text-slate-900">{formatDate(data.feature_cutoff_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Evaluation Eligibility</span>
                    <span className="text-slate-900 font-medium">
                      {data.evaluation_eligible
                        ? "Eligible (Prospective Standard)"
                        : data.exclusion_reason || "Retrospective Demonstration"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                    Input features strictly limited to trailing workload (7d/28d borough, citywide, and ZIP aggregates),
                    submission month, hour, and intake channel. No future resolution texts or closure dates were utilized.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
