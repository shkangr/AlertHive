"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  CheckCircle,
  Server,
  CalendarDays,
  Clock,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardData {
  incidents: {
    triggered: number;
    acknowledged: number;
  };
  serviceHealth: {
    active: number;
    warning: number;
    critical: number;
    maintenance: number;
    disabled: number;
    total: number;
  };
  recentIncidents: {
    id: string;
    number: number;
    title: string;
    status: string;
    urgency: string;
    createdAt: string;
    service: { id: string; name: string };
    responders: { user: { id: string; name: string } }[];
  }[];
  onCall: {
    isOnCall: boolean;
    schedules: {
      scheduleId: string;
      scheduleName: string;
      startTime: string;
      endTime: string;
    }[];
  };
  myActiveIncidents: {
    id: string;
    number: number;
    title: string;
    status: string;
    urgency: string;
    createdAt: string;
    service: { id: string; name: string };
  }[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  TRIGGERED: {
    label: "Triggered",
    className: "bg-[#CC0000] text-white hover:bg-[#CC0000]",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    className: "bg-[#FAB436] text-black hover:bg-[#FAB436]",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-[#06AC38] text-white hover:bg-[#06AC38]",
  },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Failed to load dashboard data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your incident management system
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* On-Call Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>My On-Call Status</CardDescription>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.onCall.isOnCall ? (
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#06AC38] animate-pulse" />
                  <span className="text-lg font-bold text-[#06AC38]">
                    On-Call
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {data.onCall.schedules.map((s) => (
                    <p
                      key={s.scheduleId}
                      className="text-xs text-muted-foreground"
                    >
                      {s.scheduleName}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                <span className="text-lg font-bold text-muted-foreground">
                  Off-Duty
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Triggered Incidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Triggered</CardDescription>
            <AlertTriangle className="h-4 w-4 text-[#CC0000]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.incidents.triggered}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              incidents awaiting response
            </p>
          </CardContent>
        </Card>

        {/* Acknowledged Incidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Acknowledged</CardDescription>
            <Eye className="h-4 w-4 text-[#FAB436]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.incidents.acknowledged}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              incidents being worked on
            </p>
          </CardContent>
        </Card>

        {/* Service Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Services</CardDescription>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.serviceHealth.total}</div>
            <div className="flex items-center gap-3 mt-1 text-xs">
              {data.serviceHealth.active > 0 && (
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-[#06AC38]" />
                  {data.serviceHealth.active} OK
                </span>
              )}
              {data.serviceHealth.warning > 0 && (
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-[#FAB436]" />
                  {data.serviceHealth.warning} Warn
                </span>
              )}
              {data.serviceHealth.critical > 0 && (
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-[#CC0000]" />
                  {data.serviceHealth.critical} Crit
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Active Incidents */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                My Active Incidents
              </CardTitle>
              <CardDescription>
                Incidents assigned to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.myActiveIncidents.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CheckCircle className="h-8 w-8 text-[#06AC38] mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No active incidents assigned to you
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.myActiveIncidents.map((incident) => {
                    const sc =
                      statusConfig[incident.status] || statusConfig.TRIGGERED;
                    return (
                      <Link
                        key={incident.id}
                        href={`/incidents/${incident.id}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              #{incident.number} {incident.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {incident.service.name}
                            </p>
                          </div>
                          <Badge className={`ml-2 shrink-0 ${sc.className}`}>
                            {sc.label}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Incidents */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Incidents
                </CardTitle>
                <CardDescription>Latest incidents across all services</CardDescription>
              </div>
              <Link
                href="/incidents"
                className="text-sm text-[#06AC38] hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {data.recentIncidents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No incidents yet
                </p>
              ) : (
                <div className="space-y-1">
                  {data.recentIncidents.map((incident) => {
                    const sc =
                      statusConfig[incident.status] || statusConfig.TRIGGERED;
                    return (
                      <Link
                        key={incident.id}
                        href={`/incidents/${incident.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors">
                          <Badge
                            className={`shrink-0 text-xs ${sc.className}`}
                          >
                            {sc.label}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">
                                #{incident.number}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {incident.title}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                            <span>{incident.service.name}</span>
                            <span>{timeAgo(incident.createdAt)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
