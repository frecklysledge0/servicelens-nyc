"use client";

import React from "react";
import {
  BookOpen,
  Database,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
  GitBranch,
  Scale
} from "lucide-react";
import { TopBar } from "@/components/TopBar";

export default function MethodologyPage() {
  const sections = [
    {
      id: "problem-statement",
      number: "1",
      title: "Problem Statement",
      icon: BookOpen,
      content: (
        <div className="space-y-3">
          <p>
            New York City handles tens of thousands of pothole complaints annually through its 311 intake system.
            While the Department of Transportation (DOT) aims to address roadway defects rapidly, severe winter freeze-thaw cycles,
            intake surges, and localized infrastructure burdens frequently generate administrative delays.
          </p>
          <p>
            <strong>ServiceLens NYC</strong> investigates whether early administrative and workload signals can identify
            incoming service requests that are at elevated risk of remaining unresolved for more than seven calendar days.
            Rather than replacing dispatch decisions, this platform explores operational visibility into emerging service bottlenecks.
          </p>
        </div>
      ),
    },
    {
      id: "data-source",
      number: "2",
      title: "Public Data Source & Attribution",
      icon: Database,
      content: (
        <div className="space-y-3">
          <p>
            All records displayed in this application originate directly from the official City of New York Open Data platform.
            The primary data resource is the NYC 311 Service Requests dataset maintained by the Office of Technology and Innovation (OTI).
          </p>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">API Endpoint:</span>
              <a
                href="https://data.cityofnewyork.us/resource/erm2-nwe9.json"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-indigo-600 hover:underline flex items-center gap-1"
              >
                data.cityofnewyork.us/resource/erm2-nwe9.json <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Dataset Catalog:</span>
              <a
                href="https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1"
              >
                NYC 311 Service Requests from 2020 to Present <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Official Portal:</span>
              <a
                href="https://portal.311.nyc.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1"
              >
                portal.311.nyc.gov <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "collection-frequency",
      number: "3",
      title: "Data Collection Frequency & Scheduling",
      icon: Clock,
      content: (
        <div className="space-y-3">
          <p>
            Data synchronization is conducted on a daily scheduled cadence using an automated ingestion pipeline.
            The ingestion worker queries the Socrata Open Data API with a bounded <strong>60-day rolling lookback</strong>.
          </p>
          <p>
            The 60-day lookback serves two functions:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Captures new requests submitted since the last collection run.</li>
            <li>Detects updated closure timestamps and administrative resolutions for previously open records, allowing ground-truth label maturation without missing late updates.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "cleaning-normalization",
      number: "4",
      title: "Cleaning & Normalization",
      icon: Layers,
      content: (
        <div className="space-y-3">
          <p>
            Raw API feeds undergo schema normalization before storage and model processing:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Column mapping:</strong> Socrata field names are aligned with model schema (e.g. <code>complaint_type</code> &rarr; <code>problem_formerly_complaint_type</code>).</li>
            <li><strong>Geographic cleansing:</strong> Borough strings are trimmed and normalized to canonical uppercase values. ZIP codes are stripped of float decimals (e.g., <code>10001.0</code> &rarr; <code>10001</code>).</li>
            <li><strong>Coordinate validation:</strong> Non-numeric or missing coordinate pairs remain in borough summaries but are excluded from point maps. No synthetic coordinates are created.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "target-definition",
      number: "5",
      title: "Definition of a Delayed Request",
      icon: Scale,
      content: (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
            <strong>Critical Distinction: </strong>
            The modeled target represents <strong>administrative closure time</strong> recorded in the 311 system,
            <em>not</em> a verified sensor-based or physical repair timestamp.
          </div>
          <p>
            A request is defined as experiencing an administrative delay if the elapsed duration between <code>created_date</code>
            and administrative <code>closed_date</code> exceeds <strong>7 calendar days (168 hours)</strong>, or if the request
            is verified to remain in an active unclosed status (<code>Open</code>, <code>In Progress</code>, or <code>Pending</code>)
            after 7 calendar days have elapsed.
          </p>
        </div>
      ),
    },
    {
      id: "censoring-handling",
      number: "6",
      title: "Handling of Open & Censored Requests",
      icon: ShieldCheck,
      content: (
        <div className="space-y-3">
          <p>
            Proper survival analysis principles are enforced to prevent label leakage and false assumptions:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Immature observation windows:</strong> Requests less than 7 days old cannot yet be evaluated for 7-day delay. They are marked with <code>outcome_label = NULL</code> and <code>outcome_eligibility = FALSE</code>.</li>
            <li><strong>Confirmed open requests:</strong> Requests older than 7 days that remain open are definitively marked positive (delayed).</li>
            <li><strong>Data anomalies:</strong> Records where <code>closed_date &lt; created_date</code> or status is marked closed without a timestamp are excluded from validation.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "feature-engineering",
      number: "7",
      title: "Feature Engineering & Leakage Prevention",
      icon: GitBranch,
      content: (
        <div className="space-y-3">
          <p>
            To prevent temporal data leakage, all features are computed strictly using information available
            prior to or at the moment of complaint registration:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-800">Rolling Workload Aggregates</div>
              <p className="mt-1 text-slate-600">
                Trailing 7-day and 28-day complaint volume across citywide, borough, and ZIP-code levels using a strict <code>shift(1)</code> calendar lag. Current day intake is excluded from previous-day counts.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-800">Intake & Calendar Features</div>
              <p className="mt-1 text-slate-600">
                Complaint descriptor, intake channel (Online, Phone, Mobile), submission hour of day, day of week, and registration calendar month.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Resolution descriptions, inspection notes, closing timestamps, and future city actions are strictly prohibited from the feature matrix.
          </p>
        </div>
      ),
    },
    {
      id: "model-architecture",
      number: "8",
      title: "Model Architecture & Pipeline Selection",
      icon: Layers,
      content: (
        <div className="space-y-3">
          <p>
            The selected model candidate is an <strong>Extra Trees Classifier</strong> (Extremely Randomized Trees)
            persisted in <code>servicelens_v1.joblib</code> with compatible scikit-learn 1.5.2 preprocessing:
          </p>
          <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto">
            {`Pipeline(steps=[
  ('preprocess', ColumnTransformer(transformers=[
    ('cat', Pipeline([('imputer', SimpleImputer(strategy='most_frequent')),
                      ('onehot', OneHotEncoder(handle_unknown='ignore'))])),
    ('num', Pipeline([('imputer', SimpleImputer(strategy='median'))]))
  ])),
  ('model', ExtraTreesClassifier(
    n_estimators=150,
    max_depth=12,
    min_samples_leaf=30,
    random_state=42,
    n_jobs=-1
  ))
])`}
          </div>
          <p>
            The shallow tree constraint (<code>max_depth=12</code>) and minimum leaf size (<code>min_samples_leaf=30</code>)
            were chosen during development to curtail overfitting across cyclical municipal operational patterns.
          </p>
        </div>
      ),
    },
    {
      id: "chronological-validation",
      number: "9",
      title: "Chronological Validation Methodology",
      icon: CheckCircle2,
      content: (
        <div className="space-y-3">
          <p>
            Traditional k-fold cross-validation is inappropriate for civic operational data due to temporal autocorrelation.
            Instead, historical models were evaluated using chronological rolling splits:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>2022–2024 Development Folds:</strong> Mean PR-AUC of 0.2132 and ROC-AUC of 0.7359 with positive Brier skill over constant prevalence baselines.</li>
            <li><strong>2025 Retrospective Diagnostic:</strong> Out-of-sample evaluation yielding PR-AUC of 0.1390 and ROC-AUC of 0.6219.</li>
            <li><strong>2026 Stress Diagnostic:</strong> Retrospective stress period during heavy winter conditions yielding PR-AUC of 0.3038 and ROC-AUC of 0.5580.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "model-limitations",
      number: "10",
      title: "Known Distribution Shifts & Limitations",
      icon: AlertTriangle,
      content: (
        <div className="space-y-3">
          <p>
            Users and analysts must recognize several key structural limitations:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Duplicate reporting cascades:</strong> Heavy freeze-thaw storms often produce repeated citizen complaints for the same street defect, artificially inflating localized volume features.</li>
            <li><strong>Municipal policy shifts:</strong> The city's internal closure protocols shifted noticeably between 2021 (18.2% delay rate) and 2023 (4.6% delay rate). Models trained on historical periods exhibit calibration drift when citywide administrative throughput changes.</li>
            <li><strong>Relative vs Absolute Risk:</strong> Scores are reliable for relative ranking within a recent comparison cohort, but should not be treated as calibrated event probabilities.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "privacy-ethics",
      number: "11",
      title: "Privacy & Responsible Civic Interpretation",
      icon: Lock,
      content: (
        <div className="space-y-3">
          <p>
            ServiceLens NYC adheres strictly to ethical civic open data standards:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>No personally identifiable information (PII):</strong> Complainant identities, phone numbers, and private contact channels are never ingested or stored.</li>
            <li><strong>Non-causal interpretation:</strong> Model predictions reflect historical statistical correlations with administrative closure times. They do not constitute causal evaluations of municipal worker productivity or agency culpability.</li>
            <li><strong>Research status:</strong> This project is an experimental data science intelligence prototype. It is not an official municipal dispatch system or agency dispatch directive.</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div>
      <TopBar
        title="Methodology & Data"
        subtitle="Transparent documentation of data collection, target definitions, validation, and ethical considerations."
        badgeText="11 Methodology Sections"
      />

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-8">
        {/* Quick Nav Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Table of Contents
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
              >
                {sec.number}. {sec.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections Content */}
        <div className="space-y-6">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <section
                key={sec.id}
                id={sec.id}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4 scroll-mt-24"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {sec.number}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Icon className="w-4 h-4 text-indigo-600" />
                    {sec.title}
                  </h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {sec.content}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
