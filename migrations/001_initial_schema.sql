-- ServiceLens NYC: PostgreSQL & Supabase Database Migration
-- 001_initial_schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Service Requests Table
CREATE TABLE IF NOT EXISTS service_requests (
    unique_key VARCHAR(64) PRIMARY KEY,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(64) NOT NULL DEFAULT 'Open',
    agency VARCHAR(32) DEFAULT 'DOT',
    complaint_type VARCHAR(128),
    descriptor VARCHAR(256),
    borough VARCHAR(64),
    incident_zip VARCHAR(16),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    open_data_channel_type VARCHAR(64),
    resolution_description TEXT,
    resolution_action_updated_date TIMESTAMP WITH TIME ZONE,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_backfill BOOLEAN NOT NULL DEFAULT FALSE,
    source_updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_service_requests_created_date ON service_requests (created_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_borough ON service_requests (borough);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status);
CREATE INDEX IF NOT EXISTS idx_service_requests_zip ON service_requests (incident_zip);

-- 2. Predictions Table (Immutable Audit of Inferences)
CREATE TABLE IF NOT EXISTS predictions (
    prediction_id VARCHAR(64) PRIMARY KEY,
    unique_key VARCHAR(64) NOT NULL REFERENCES service_requests(unique_key) ON DELETE CASCADE,
    model_version VARCHAR(64) NOT NULL,
    scored_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    target_horizon_days INTEGER NOT NULL DEFAULT 7,
    raw_model_score DOUBLE PRECISION NOT NULL,
    risk_percentile DOUBLE PRECISION NOT NULL,
    risk_band VARCHAR(32) NOT NULL, -- 'Typical relative score', 'Elevated relative score', 'High relative score'
    feature_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    feature_cutoff_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_prospective BOOLEAN NOT NULL DEFAULT FALSE,
    evaluation_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    exclusion_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_predictions_unique_key ON predictions (unique_key);
CREATE INDEX IF NOT EXISTS idx_predictions_scored_at ON predictions (scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_risk_band ON predictions (risk_band);
CREATE INDEX IF NOT EXISTS idx_predictions_eligible ON predictions (evaluation_eligible, is_prospective);

-- 3. Ground Truth Outcomes Table
CREATE TABLE IF NOT EXISTS outcomes (
    outcome_id VARCHAR(64) PRIMARY KEY,
    unique_key VARCHAR(64) NOT NULL REFERENCES service_requests(unique_key) ON DELETE CASCADE,
    evaluation_horizon INTEGER NOT NULL DEFAULT 7,
    outcome_label INTEGER, -- 1 = delayed (>7d or still open at 7d), 0 = closed <=7d, NULL = immature / unknown
    outcome_observed_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    outcome_eligibility BOOLEAN NOT NULL DEFAULT TRUE,
    label_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    unknown_reason TEXT,
    CONSTRAINT uq_outcomes_request_horizon UNIQUE (unique_key, evaluation_horizon)
);

CREATE INDEX IF NOT EXISTS idx_outcomes_unique_key ON outcomes (unique_key);
CREATE INDEX IF NOT EXISTS idx_outcomes_label ON outcomes (outcome_label);

-- 4. Sync Runs Table (Pipeline Monitoring)
CREATE TABLE IF NOT EXISTS sync_runs (
    run_id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
    rows_fetched INTEGER NOT NULL DEFAULT 0,
    rows_inserted INTEGER NOT NULL DEFAULT 0,
    rows_updated INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    latest_source_observed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at ON sync_runs (started_at DESC);
