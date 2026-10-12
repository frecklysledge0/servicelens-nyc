import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const p1 = path.resolve(process.cwd(), "data/servicelens.db");
  const p2 = path.resolve(process.cwd(), "../data/servicelens.db");
  const dbPath = process.env.DATABASE_PATH || (fs.existsSync(p1) ? p1 : p2);

  dbInstance = new Database(dbPath, { readonly: false });
  try {
    dbInstance.pragma("journal_mode = WAL");
  } catch {
    // Non-critical if WAL already set
  }
  return dbInstance;
}

export interface OverviewMetrics {
  new_requests_7d: number;
  open_requests: number;
  median_closure_time_days: number;
  elevated_relative_risk_count: number;
  last_data_refresh: string | null;
  latest_observation_date: string | null;
  model_version: string;
  total_requests: number;
  trend_data: Array<{
    date: string;
    incoming: number;
    closed: number;
    delayed: number;
  }>;
  borough_summary: Array<{
    borough: string;
    total: number;
    open: number;
    closed: number;
    delayed: number;
    delay_rate_pct: number;
  }>;
  top_risk_requests: Array<{
    unique_key: string;
    created_date: string;
    borough: string;
    descriptor: string;
    status: string;
    raw_model_score: number;
    risk_percentile: number;
    risk_band: string;
  }>;
}

export function getOverviewMetrics(): OverviewMetrics {
  const db = getDb();

  // Find latest observed date in the DB
  const latestRow = db.prepare("SELECT MAX(created_date) as max_date, MIN(created_date) as min_date, COUNT(*) as total FROM service_requests").get() as { max_date: string; min_date: string; total: number };
  const latestDateStr = latestRow?.max_date || new Date().toISOString();
  const latestDate = new Date(latestDateStr);

  // Trailing 7 days cutoff relative to latest observation
  const cutoff7d = new Date(latestDate.getTime() - 7 * 86400 * 1000).toISOString();

  // New requests 7d
  const new7dRow = db.prepare("SELECT COUNT(*) as c FROM service_requests WHERE created_date >= ?").get(cutoff7d) as { c: number };
  const newRequests7d = new7dRow?.c || 0;

  // Open requests
  const openRow = db.prepare("SELECT COUNT(*) as c FROM service_requests WHERE status IN ('Open', 'In Progress', 'Pending')").get() as { c: number };
  const openRequests = openRow?.c || 0;

  // Median closure time for closed requests
  const durations = db.prepare(`
    SELECT (strftime('%s', closed_date) - strftime('%s', created_date)) / 86400.0 as days
    FROM service_requests
    WHERE closed_date IS NOT NULL AND strftime('%s', closed_date) >= strftime('%s', created_date)
    ORDER BY days ASC
  `).all() as Array<{ days: number }>;

  let medianClosureDays = 2.4;
  if (durations.length > 0) {
    const mid = Math.floor(durations.length / 2);
    medianClosureDays = Math.round(durations[mid].days * 10) / 10;
  }

  // Elevated / High relative risk count (top 10% / High relative score)
  const highRiskRow = db.prepare("SELECT COUNT(*) as c FROM predictions WHERE risk_band = 'High relative score'").get() as { c: number };
  const elevatedRelativeRiskCount = highRiskRow?.c || 0;

  // Sync run status
  const syncRow = db.prepare("SELECT finished_at, latest_source_observed_at FROM sync_runs ORDER BY started_at DESC LIMIT 1").get() as { finished_at: string; latest_source_observed_at: string } | undefined;

  // Daily trends (last 30 days)
  const cutoff30d = new Date(latestDate.getTime() - 30 * 86400 * 1000).toISOString();
  const dailyRows = db.prepare(`
    SELECT
      substr(created_date, 1, 10) as day,
      COUNT(*) as incoming,
      SUM(CASE WHEN closed_date IS NOT NULL THEN 1 ELSE 0 END) as closed,
      SUM(CASE WHEN (strftime('%s', closed_date) - strftime('%s', created_date)) > 604800 THEN 1 ELSE 0 END) as delayed
    FROM service_requests
    WHERE created_date >= ?
    GROUP BY day
    ORDER BY day ASC
  `).all(cutoff30d) as Array<{ day: string; incoming: number; closed: number; delayed: number }>;

  const trendData = dailyRows.map(r => ({
    date: r.day,
    incoming: r.incoming,
    closed: r.closed,
    delayed: r.delayed || 0,
  }));

  // Borough breakdown
  const boroughRows = db.prepare(`
    SELECT
      COALESCE(NULLIF(UPPER(TRIM(borough)), ''), 'UNKNOWN') as b_clean,
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('Open', 'In Progress', 'Pending') THEN 1 ELSE 0 END) as open_cnt,
      SUM(CASE WHEN closed_date IS NOT NULL THEN 1 ELSE 0 END) as closed_cnt,
      SUM(CASE WHEN (strftime('%s', closed_date) - strftime('%s', created_date)) > 604800 OR (status IN ('Open', 'In Progress', 'Pending') AND (strftime('%s', ?) - strftime('%s', created_date)) > 604800) THEN 1 ELSE 0 END) as delayed_cnt
    FROM service_requests
    GROUP BY b_clean
    ORDER BY total DESC
  `).all(latestDateStr) as Array<{ b_clean: string; total: number; open_cnt: number; closed_cnt: number; delayed_cnt: number }>;

  const boroughSummary = boroughRows.map(b => ({
    borough: b.b_clean,
    total: b.total,
    open: b.open_cnt,
    closed: b.closed_cnt,
    delayed: b.delayed_cnt,
    delay_rate_pct: b.total > 0 ? Math.round((b.delayed_cnt / b.total) * 1000) / 10 : 0,
  }));

  // Top risk requests
  const topRiskRows = db.prepare(`
    SELECT
      sr.unique_key,
      sr.created_date,
      sr.borough,
      sr.descriptor,
      sr.status,
      p.raw_model_score,
      p.risk_percentile,
      p.risk_band
    FROM predictions p
    JOIN service_requests sr ON sr.unique_key = p.unique_key
    ORDER BY p.raw_model_score DESC
    LIMIT 10
  `).all() as Array<{
    unique_key: string;
    created_date: string;
    borough: string;
    descriptor: string;
    status: string;
    raw_model_score: number;
    risk_percentile: number;
    risk_band: string;
  }>;

  return {
    new_requests_7d: newRequests7d,
    open_requests: openRequests,
    median_closure_time_days: medianClosureDays,
    elevated_relative_risk_count: elevatedRelativeRiskCount,
    last_data_refresh: syncRow?.finished_at || null,
    latest_observation_date: syncRow?.latest_source_observed_at || latestDateStr,
    model_version: "servicelens-v1",
    total_requests: latestRow?.total || 0,
    trend_data: trendData,
    borough_summary: boroughSummary,
    top_risk_requests: topRiskRows,
  };
}

export interface RequestFilterParams {
  search?: string;
  borough?: string;
  status?: string;
  risk_band?: string;
  descriptor?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export function getRequestsList(params: RequestFilterParams) {
  const db = getDb();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(10, params.limit || 25));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const args: any[] = [];

  if (params.search) {
    whereClauses.push("(sr.unique_key LIKE ? OR sr.incident_zip LIKE ?)");
    args.push(`%${params.search}%`, `%${params.search}%`);
  }

  if (params.borough && params.borough !== "ALL") {
    whereClauses.push("UPPER(sr.borough) = ?");
    args.push(params.borough.toUpperCase());
  }

  if (params.status && params.status !== "ALL") {
    whereClauses.push("sr.status = ?");
    args.push(params.status);
  }

  if (params.risk_band && params.risk_band !== "ALL") {
    whereClauses.push("p.risk_band = ?");
    args.push(params.risk_band);
  }

  if (params.descriptor && params.descriptor !== "ALL") {
    whereClauses.push("sr.descriptor LIKE ?");
    args.push(`%${params.descriptor}%`);
  }

  if (params.start_date) {
    whereClauses.push("sr.created_date >= ?");
    args.push(params.start_date);
  }

  if (params.end_date) {
    whereClauses.push("sr.created_date <= ?");
    args.push(params.end_date);
  }

  const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

  // Sort column validation
  const allowedSorts: Record<string, string> = {
    created_date: "sr.created_date",
    unique_key: "sr.unique_key",
    status: "sr.status",
    borough: "sr.borough",
    raw_model_score: "p.raw_model_score",
    risk_percentile: "p.risk_percentile",
  };
  const sortCol = allowedSorts[params.sort_by || "created_date"] || "sr.created_date";
  const sortOrder = params.sort_order === "asc" ? "ASC" : "DESC";

  // Total count
  const countRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM service_requests sr
    LEFT JOIN predictions p ON p.unique_key = sr.unique_key
    ${whereSql}
  `).get(...args) as { total: number };

  const total = countRow?.total || 0;

  // Data rows
  const query = `
    SELECT
      sr.unique_key,
      sr.created_date,
      sr.closed_date,
      sr.status,
      sr.agency,
      sr.complaint_type,
      sr.descriptor,
      sr.borough,
      sr.incident_zip,
      sr.latitude,
      sr.longitude,
      sr.open_data_channel_type,
      p.raw_model_score,
      p.risk_percentile,
      p.risk_band,
      p.model_version,
      p.scored_at,
      p.is_prospective,
      p.evaluation_eligible
    FROM service_requests sr
    LEFT JOIN predictions p ON p.unique_key = sr.unique_key
    ${whereSql}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...args, limit, offset);

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getRequestById(uniqueKey: string) {
  const db = getDb();
  const req = db.prepare(`
    SELECT
      sr.*,
      p.raw_model_score,
      p.risk_percentile,
      p.risk_band,
      p.model_version,
      p.scored_at,
      p.feature_cutoff_at,
      p.is_prospective,
      p.evaluation_eligible,
      p.exclusion_reason,
      o.outcome_label,
      o.unknown_reason as outcome_reason
    FROM service_requests sr
    LEFT JOIN predictions p ON p.unique_key = sr.unique_key
    LEFT JOIN outcomes o ON o.unique_key = sr.unique_key
    WHERE sr.unique_key = ?
  `).get(uniqueKey);

  return req || null;
}

export function getMapData(params: { borough?: string; risk_band?: string; status?: string; limit?: number }) {
  const db = getDb();
  const limit = Math.min(2000, params.limit || 800);

  // Coverage statistics
  const totalRow = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) as geocoded FROM service_requests").get() as { total: number; geocoded: number };

  const whereClauses: string[] = ["sr.latitude IS NOT NULL", "sr.longitude IS NOT NULL"];
  const args: any[] = [];

  if (params.borough && params.borough !== "ALL") {
    whereClauses.push("UPPER(sr.borough) = ?");
    args.push(params.borough.toUpperCase());
  }

  if (params.status && params.status !== "ALL") {
    whereClauses.push("sr.status = ?");
    args.push(params.status);
  }

  if (params.risk_band && params.risk_band !== "ALL") {
    whereClauses.push("p.risk_band = ?");
    args.push(params.risk_band);
  }

  const whereSql = "WHERE " + whereClauses.join(" AND ");

  const points = db.prepare(`
    SELECT
      sr.unique_key,
      sr.created_date,
      sr.status,
      sr.descriptor,
      sr.borough,
      sr.incident_zip,
      sr.latitude,
      sr.longitude,
      p.raw_model_score,
      p.risk_percentile,
      p.risk_band
    FROM service_requests sr
    LEFT JOIN predictions p ON p.unique_key = sr.unique_key
    ${whereSql}
    ORDER BY sr.created_date DESC
    LIMIT ?
  `).all(...args, limit);

  return {
    points,
    coverage: {
      total_requests: totalRow.total,
      geocoded_count: totalRow.geocoded,
      missing_coords_count: totalRow.total - totalRow.geocoded,
      coverage_pct: totalRow.total > 0 ? Math.round((totalRow.geocoded / totalRow.total) * 1000) / 10 : 0,
    },
  };
}

export function getModelPerformance() {
  const db = getDb();

  // Prediction risk band distribution
  const riskDist = db.prepare(`
    SELECT risk_band, COUNT(*) as count
    FROM predictions
    GROUP BY risk_band
  `).all() as Array<{ risk_band: string; count: number }>;

  // Total predictions scored
  const totalPredsRow = db.prepare("SELECT COUNT(*) as c, AVG(raw_model_score) as avg_score FROM predictions").get() as { c: number; avg_score: number };

  return {
    metadata: {
      model_name: "Extra Trees Classifier",
      model_version: "servicelens-v1",
      training_period: "2020–2024",
      target_definition: "Administrative closure exceeded 7 days or remained open beyond 7 days",
      feature_version: "v1 (14 input features, 269 transformed pipeline columns)",
      scikit_learn_version: "1.5.2",
      evaluation_status: "Experimental — prospective validation in progress",
      last_scoring_cutoff: "Pre-cutoff trailing windows (zero future leakage)",
    },
    historical_metrics: {
      rolling_2022_2024: {
        pr_auc: 0.2132,
        roc_auc: 0.7359,
        brier_score: 0.0742,
        brier_skill: 0.0714,
        description: "Rolling chronological folds across 2022–2024 development windows.",
      },
      retrospective_2025: {
        pr_auc: 0.1390,
        roc_auc: 0.6219,
        brier_score: 0.0892,
        constant_baseline_brier: 0.0902,
        description: "Retrospective 2025 out-of-sample diagnostic fold.",
      },
      retrospective_2026: {
        pr_auc: 0.3038,
        roc_auc: 0.5580,
        brier_score: 0.2035,
        constant_baseline_brier: 0.2115,
        description: "Retrospective 2026 stress period characterized by substantial delay prevalence shift.",
      },
    },
    delay_rate_trend_by_year: [
      { year: "2020", delay_rate_pct: 8.4 },
      { year: "2021", delay_rate_pct: 18.2 },
      { year: "2022", delay_rate_pct: 9.7 },
      { year: "2023", delay_rate_pct: 4.6 },
      { year: "2024", delay_rate_pct: 8.1 },
      { year: "2025", delay_rate_pct: 8.9 },
      { year: "2026", delay_rate_pct: 21.0 },
    ],
    feature_importances: [
      { feature: "Month: April (created_month_cat_4)", importance: 0.1555 },
      { feature: "Month: May (created_month_cat_5)", importance: 0.0985 },
      { feature: "Trailing 28d Citywide Reports", importance: 0.0941 },
      { feature: "Borough: Bronx", importance: 0.0573 },
      { feature: "Month: January (created_month_cat_1)", importance: 0.0565 },
      { feature: "Trailing 7d Citywide Reports", importance: 0.0537 },
      { feature: "Month: February (created_month_cat_2)", importance: 0.0510 },
      { feature: "Borough: Manhattan", importance: 0.0481 },
      { feature: "Month: December (created_month_cat_12)", importance: 0.0447 },
      { feature: "Borough: Unknown / Highway", importance: 0.0395 },
      { feature: "ZIP: Unspecified", importance: 0.0315 },
      { feature: "Trailing 28d Borough Reports", importance: 0.0303 },
      { feature: "Borough: Staten Island", importance: 0.0266 },
      { feature: "Borough: Queens", importance: 0.0173 },
      { feature: "Complaint: Street Condition", importance: 0.0172 },
    ],
    calibration_deciles: [
      { decile: "D1 (0-10%)", mean_predicted: 0.074, observed_delay_rate: 0.062 },
      { decile: "D2 (10-20%)", mean_predicted: 0.081, observed_delay_rate: 0.071 },
      { decile: "D3 (20-30%)", mean_predicted: 0.084, observed_delay_rate: 0.078 },
      { decile: "D4 (30-40%)", mean_predicted: 0.086, observed_delay_rate: 0.082 },
      { decile: "D5 (40-50%)", mean_predicted: 0.088, observed_delay_rate: 0.091 },
      { decile: "D6 (50-60%)", mean_predicted: 0.091, observed_delay_rate: 0.104 },
      { decile: "D7 (60-70%)", mean_predicted: 0.094, observed_delay_rate: 0.120 },
      { decile: "D8 (70-80%)", mean_predicted: 0.115, observed_delay_rate: 0.148 },
      { decile: "D9 (80-90%)", mean_predicted: 0.142, observed_delay_rate: 0.185 },
      { decile: "D10 (90-100%)", mean_predicted: 0.188, observed_delay_rate: 0.245 },
    ],
    live_cohort_summary: {
      scored_count: totalPredsRow?.c || 0,
      mean_score: Math.round((totalPredsRow?.avg_score || 0) * 10000) / 10000,
      risk_distribution: riskDist,
    },
  };
}

export function getDataFreshness() {
  const db = getDb();
  const run = db.prepare("SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 1").get() as any;
  const countRow = db.prepare("SELECT COUNT(*) as c, MAX(created_date) as latest_dt FROM service_requests").get() as any;

  return {
    sync_status: run?.status || "unknown",
    last_sync_started: run?.started_at || null,
    last_sync_finished: run?.finished_at || null,
    rows_fetched: run?.rows_fetched || 0,
    rows_inserted: run?.rows_inserted || 0,
    rows_updated: run?.rows_updated || 0,
    total_stored_requests: countRow?.c || 0,
    latest_source_observation: run?.latest_source_observed_at || countRow?.latest_dt || null,
  };
}
