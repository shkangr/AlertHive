"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CreateServiceDialog } from "@/components/services/create-service-dialog";

interface Service {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  team: { id: string; name: string } | null;
  escalationPolicy: { id: string; name: string } | null;
  _count: { incidents: number; integrations: number };
}

interface Team {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; variant: string; className: string }> = {
  ACTIVE: { label: "Active", variant: "default", className: "bg-[#06AC38] text-white hover:bg-[#06AC38]" },
  WARNING: { label: "Warning", variant: "default", className: "bg-[#FAB436] text-black hover:bg-[#FAB436]" },
  CRITICAL: { label: "Critical", variant: "destructive", className: "" },
  MAINTENANCE: { label: "Maintenance", variant: "default", className: "bg-blue-500 text-white hover:bg-blue-500" },
  DISABLED: { label: "Disabled", variant: "default", className: "bg-gray-400 text-white hover:bg-gray-400" },
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchServices = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (teamFilter) params.set("teamId", teamFilter);

    const res = await fetch(`/api/services?${params}`);
    if (res.ok) {
      const data = await res.json();
      setServices(data);
    }
    setLoading(false);
  }, [search, teamFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Manage your services and their integrations
          </p>
        </div>
        <Button
          className="bg-[#06AC38] hover:bg-[#059030] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Service
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading…
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-sm text-muted-foreground">No services found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first service
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Escalation Policy</TableHead>
                <TableHead className="text-right">Incidents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const sc = statusConfig[service.status] || statusConfig.ACTIVE;
                return (
                  <TableRow key={service.id}>
                    <TableCell>
                      <Link
                        href={`/services/${service.id}`}
                        className="font-medium text-foreground hover:text-[#06AC38] hover:underline"
                      >
                        {service.name}
                      </Link>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                          {service.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={sc.className}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {service.team?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {service.escalationPolicy?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {service._count.incidents}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchServices}
      />
    </div>
  );
}
