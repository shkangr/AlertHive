"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Key,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateServiceDialog } from "@/components/services/create-service-dialog";

interface Integration {
  id: string;
  name: string;
  integrationKey: string;
  createdAt: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  urgency: string;
  createdAt: string;
}

interface ServiceDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  team: { id: string; name: string } | null;
  escalationPolicy: { id: string; name: string } | null;
  integrations: Integration[];
  incidents: Incident[];
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-[#06AC38] text-white hover:bg-[#06AC38]",
  },
  WARNING: {
    label: "Warning",
    className: "bg-[#FAB436] text-black hover:bg-[#FAB436]",
  },
  CRITICAL: {
    label: "Critical",
    className: "bg-[#CC0000] text-white hover:bg-[#CC0000]",
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "bg-blue-500 text-white hover:bg-blue-500",
  },
  DISABLED: {
    label: "Disabled",
    className: "bg-gray-400 text-white hover:bg-gray-400",
  },
};

const incidentStatusConfig: Record<string, { label: string; className: string }> = {
  TRIGGERED: {
    label: "Triggered",
    className: "bg-[#CC0000] text-white hover:bg-[#CC0000]",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    className: "bg-[#FAB436] text-black hover:bg-[#FAB436]",
  },
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [addIntegrationOpen, setAddIntegrationOpen] = useState(false);
  const [integrationName, setIntegrationName] = useState("");
  const [addingIntegration, setAddingIntegration] = useState(false);

  const fetchService = useCallback(async () => {
    const res = await fetch(`/api/services/${id}`);
    if (res.ok) {
      setService(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleAddIntegration(e: React.FormEvent) {
    e.preventDefault();
    setAddingIntegration(true);

    const res = await fetch(`/api/services/${id}/integrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: integrationName }),
    });

    setAddingIntegration(false);

    if (res.ok) {
      setAddIntegrationOpen(false);
      setIntegrationName("");
      fetchService();
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this service?")) return;

    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/services");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Service not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/services")}
        >
          Back to Services
        </Button>
      </div>
    );
  }

  const sc = statusConfig[service.status] || statusConfig.ACTIVE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/services"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Services
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {service.name}
            </h1>
            <Badge className={sc.className}>{sc.label}</Badge>
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground">
              {service.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {service.team?.name || "No team assigned"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Escalation Policy</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {service.escalationPolicy?.name || "No policy assigned"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Created</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {new Date(service.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Integrations</CardTitle>
            <CardDescription>
              Integration keys for sending alerts to this service
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddIntegrationOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Integration
          </Button>
        </CardHeader>
        <CardContent>
          {service.integrations.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Key className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No integrations yet. Add one to start receiving alerts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {service.integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{integration.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        {integration.integrationKey}
                      </code>
                      <button
                        onClick={() => copyKey(integration.integrationKey)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedKey === integration.integrationKey ? (
                          <Check className="h-3.5 w-3.5 text-[#06AC38]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(integration.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Incidents</CardTitle>
          <CardDescription>
            Open incidents currently affecting this service
          </CardDescription>
        </CardHeader>
        <CardContent>
          {service.incidents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No active incidents
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {service.incidents.map((incident) => {
                  const isc =
                    incidentStatusConfig[incident.status] ||
                    incidentStatusConfig.TRIGGERED;
                  return (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">
                        {incident.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={isc.className}>{isc.label}</Badge>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {incident.urgency.toLowerCase()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(incident.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CreateServiceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onCreated={fetchService}
        service={service}
      />

      {/* Add Integration Dialog */}
      <Dialog open={addIntegrationOpen} onOpenChange={setAddIntegrationOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
            <DialogDescription>
              Create a new integration key for this service
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddIntegration}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="integrationName">Integration name</Label>
                <Input
                  id="integrationName"
                  placeholder="e.g. Datadog, Sentry, Custom"
                  value={integrationName}
                  onChange={(e) => setIntegrationName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddIntegrationOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#06AC38] hover:bg-[#059030] text-white"
                disabled={addingIntegration}
              >
                {addingIntegration ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
