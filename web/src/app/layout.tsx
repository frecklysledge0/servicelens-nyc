import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "ServiceLens NYC — Pothole Service Intelligence",
  description:
    "Production-style civic data intelligence platform ranking NYC 311 pothole service requests by relative risk of administrative closure delays exceeding 7 days.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-[#F7F8FC] text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
            <main className="flex-1 pb-16 pt-14 lg:pt-0">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
