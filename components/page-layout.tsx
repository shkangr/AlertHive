"use client";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

interface PageLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageLayout({ children, breadcrumbs }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="lg:pl-60">
        <Topbar breadcrumbs={breadcrumbs} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
