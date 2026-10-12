"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TableProperties,
  MapPin,
  LineChart,
  BookOpen,
  Menu,
  X,
  Database,
  Layers,
  Sparkles,
  ExternalLink
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      name: "Overview",
      href: "/",
      icon: LayoutDashboard,
      description: "Service intelligence & KPIs",
    },
    {
      name: "Live Requests",
      href: "/requests",
      icon: TableProperties,
      description: "Ranked operational backlog",
    },
    {
      name: "Spatial Explorer",
      href: "/map",
      icon: MapPin,
      description: "Geospatial risk clusters",
    },
    {
      name: "Model Performance",
      href: "/model",
      icon: LineChart,
      description: "Validation & feature importance",
    },
    {
      name: "Methodology",
      href: "/methodology",
      icon: BookOpen,
      description: "Pipeline & ethical caveats",
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111827] text-slate-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">
                ServiceLens NYC
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Civic Data Intelligence
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            NYC Open Data · 311
          </span>
          <span className="font-mono text-[10px] text-slate-400">DOT</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                }`}
              />
              <div className="flex-1">
                <div className="leading-tight">{item.name}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Model & Source Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 text-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Model Version
          </span>
          <span className="font-mono font-medium text-[11px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700">
            servicelens-v1
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Source Pipeline
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Connected
          </span>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span>Target: &gt;7d admin closure</span>
          <a
            href="https://data.cityofnewyork.us/resource/erm2-nwe9"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 flex items-center gap-0.5"
          >
            Socrata <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Top Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#111827] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">ServiceLens NYC</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
