"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";

interface Responder {
  id: string;
  user: { id: string; name: string; email: string };
}

interface Incident {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  urgency: string;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  service: { id: string; name: string };
  responders: Responder[];
}

interface ServiceOption {
  id: string;
  name: string;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
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

const urgencyConfig: Record<string, { label: string; className: string }> = {
  HIGH: {
    label: "High",
    className: "border-[#CC0000] text-[#CC0000]",
  },
  LOW: {
    label: "Low",
    className: "border-[#FAB436] text-[#FAB436]",
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

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("TRIGGERED");
  const [serviceFilter, setServiceFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (serviceFilter) params.set("serviceId", serviceFilter);
    if (urgencyFilter) params.set("urgency", urgencyFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/incidents?${params}`);
    if (res.ok) {
      setIncidents(await res.json());
    }
    setLoading(false);
  }, [statusFilter, serviceFilter, urgencyFilter, search]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ServiceOption[]) =>
        setServices(data.map((s) => ({ id: s.id, name: s.name })))
      )
      .catch(() => setServices([]));
  }, []);

  const counts = {
    TRIGGERED: 0,
    ACKNOWLEDGED: 0,
    RESOLVED: 0,
  };

  // We show counts based on all incidents (not filtered by status)
  // For simplicity, just show current tab results
  const filteredIncidents = incidents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage incidents across your services
          </p>
        </div>
        <Button
          className="bg-[#06AC38] hover:bg-[#059030] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Incident
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="TRIGGERED">Triggered</TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED">Acknowledged</TabsTrigger>
          <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
          <TabsTrigger value="">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={serviceFilter}
          onValueChange={(v) => setServiceFilter(v ?? "")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={urgencyFilter}
          onValueChange={(v) => setUrgencyFilter(v ?? "")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All urgency</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No incidents found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create an incident
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIncidents.map((incident) => {
            const sc =
              statusConfig[incident.status] || statusConfig.TRIGGERED;
            const uc =
              urgencyConfig[incident.urgency] || urgencyConfig.HIGH;

            return (
              <Link
                key={incident.id}
                href={`/incidents/${incident.id}`}
                className="block"
              >
                <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Badge className={sc.className}>{sc.label}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          #{incident.number}
                        </span>
                        <span className="font-medium truncate">
                          {incident.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{incident.service.name}</span>
                        <span>{timeAgo(incident.createdAt)}</span>
                        {incident.responders.length > 0 && (
                          <span>
                            {incident.responders
                              .map((r) => r.user.name)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={uc.className}>
                    {uc.label}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <CreateIncidentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchIncidents}
      />
    </div>
  );
}
