import React from "react";

interface RiskBadgeProps {
  band?: string;
  percentile?: number | null;
  score?: number | null;
  compact?: boolean;
}

export function RiskBadge({ band, percentile, score, compact = false }: RiskBadgeProps) {
  if (!band) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Unscored
      </span>
    );
  }

  let colorClasses = "bg-slate-50 text-slate-700 border-slate-200";
  let dotColor = "bg-slate-400";

  if (band.includes("High")) {
    colorClasses = "bg-rose-50 text-rose-800 border-rose-200/80";
    dotColor = "bg-rose-500";
  } else if (band.includes("Elevated")) {
    colorClasses = "bg-amber-50 text-amber-800 border-amber-200/80";
    dotColor = "bg-amber-500";
  } else {
    colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
    dotColor = "bg-emerald-500";
  }

  const pctLabel =
    percentile !== undefined && percentile !== null
      ? `${Math.round(percentile * 100)}th %ile`
      : null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{band}</span>
      {pctLabel && !compact && (
        <span className="text-[10px] opacity-75 font-tabular font-mono ml-0.5">
          ({pctLabel})
        </span>
      )}
    </div>
  );
}
