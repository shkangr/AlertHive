"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  Plus,
  Send,
  User,
  Clock,
  AlertTriangle,
  Bell,
  ArrowUpRight,
  MessageSquare,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IncidentLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string } | null;
}

interface Responder {
  id: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface Alert {
  id: string;
  summary: string;
  severity: string;
  rawPayload: unknown;
  createdAt: string;
}

interface IncidentDetail {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  urgency: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  service: {
    id: string;
    name: string;
    escalationPolicy: { id: string; name: string } | null;
  };
  responders: Responder[];
  logs: IncidentLog[];
  alerts: Alert[];
}

interface UserOption {
  id: string;
  name: string;
  email: string;
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

const logTypeIcons: Record<string, typeof AlertTriangle> = {
  CREATED: AlertTriangle,
  ACKNOWLEDGED: Eye,
  RESOLVED: CheckCircle,
  ESCALATED: ArrowUpRight,
  NOTIFIED: Bell,
  RESPONDER_ADDED: UserPlus,
  NOTE: MessageSquare,
  REASSIGNED: RefreshCw,
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [addResponderOpen, setAddResponderOpen] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingResponder, setAddingResponder] = useState(false);

  const fetchIncident = useCallback(async () => {
    const res = await fetch(`/api/incidents/${id}`);
    if (res.ok) {
      setIncident(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  async function handleAcknowledge() {
    setActionLoading(true);
    const res = await fetch(`/api/incidents/${id}/acknowledge`, {
      method: "POST",
    });
    setActionLoading(false);
    if (res.ok) fetchIncident();
  }

  async function handleResolve() {
    setActionLoading(true);
    const res = await fetch(`/api/incidents/${id}/resolve`, {
      method: "POST",
    });
    setActionLoading(false);
    if (res.ok) fetchIncident();
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setAddingNote(true);

    const res = await fetch(`/api/incidents/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: note }),
    });

    setAddingNote(false);
    if (res.ok) {
      setNote("");
      fetchIncident();
    }
  }

  async function handleAddResponder() {
    if (!selectedUserId) return;
    setAddingResponder(true);

    const res = await fetch(`/api/incidents/${id}/responders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });

    setAddingResponder(false);
    if (res.ok) {
      setAddResponderOpen(false);
      setSelectedUserId("");
      fetchIncident();
    }
  }

  function openAddResponder() {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => setUsers([]));
    setAddResponderOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Incident not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/incidents")}
        >
          Back to Incidents
        </Button>
      </div>
    );
  }

  const sc = statusConfig[incident.status] || statusConfig.TRIGGERED;
  const existingResponderIds = new Set(
    incident.responders.map((r) => r.user.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/incidents"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Incidents
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={sc.className}>{sc.label}</Badge>
            <span className="text-sm text-muted-foreground font-mono">
              #{incident.number}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              {incident.title}
            </h1>
          </div>
          {incident.description && (
            <p className="text-sm text-muted-foreground">
              {incident.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {incident.status === "TRIGGERED" && (
            <Button
              variant="outline"
              size="sm"
              className="border-[#FAB436] text-[#FAB436] hover:bg-[#FAB436] hover:text-black"
              onClick={handleAcknowledge}
              disabled={actionLoading}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Acknowledge
            </Button>
          )}
          {incident.status !== "RESOLVED" && (
            <Button
              size="sm"
              className="bg-[#06AC38] hover:bg-[#059030] text-white"
              onClick={handleResolve}
              disabled={actionLoading}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Resolve
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
              <CardDescription>Event log for this incident</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {incident.logs.map((log, index) => {
                  const IconComponent =
                    logTypeIcons[log.type] || AlertTriangle;
                  const isNote = log.type === "NOTE";

                  return (
                    <div key={log.id}>
                      <div className="flex gap-3 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${isNote ? "font-normal" : "font-medium"}`}
                          >
                            {log.message}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            {log.user && <span>{log.user.name}</span>}
                            <span>
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {index < incident.logs.length - 1 && (
                        <div className="ml-4 border-l border-muted h-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Note */}
              {incident.status !== "RESOLVED" && (
                <form
                  onSubmit={handleAddNote}
                  className="mt-4 flex items-center gap-2 border-t pt-4"
                >
                  <Input
                    placeholder="Add a note..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={addingNote || !note.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {incident.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alerts</CardTitle>
                <CardDescription>
                  Raw alert data associated with this incident
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incident.alerts.map((alert) => (
                    <div key={alert.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{alert.summary}</p>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                      {alert.rawPayload != null && (
                        <pre className="mt-2 rounded bg-muted p-2 text-xs font-mono overflow-auto max-h-40">
                          {JSON.stringify(alert.rawPayload, null, 2)}
                        </pre>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Details & Responders */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Service</p>
                <Link
                  href={`/services/${incident.service.id}`}
                  className="text-sm font-medium hover:text-[#06AC38] hover:underline"
                >
                  {incident.service.name}
                </Link>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Escalation Policy
                </p>
                <p className="text-sm font-medium">
                  {incident.service.escalationPolicy ? (
                    <Link
                      href={`/escalation-policies/${incident.service.escalationPolicy.id}`}
                      className="hover:text-[#06AC38] hover:underline"
                    >
                      {incident.service.escalationPolicy.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Urgency</p>
                <p className="text-sm font-medium capitalize">
                  {incident.urgency.toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">
                  {new Date(incident.createdAt).toLocaleString()}
                </p>
              </div>
              {incident.acknowledgedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Acknowledged
                  </p>
                  <p className="text-sm">
                    {new Date(incident.acknowledgedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {incident.resolvedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Resolved
                  </p>
                  <p className="text-sm">
                    {new Date(incident.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Responders</CardTitle>
                <CardDescription>
                  People assigned to this incident
                </CardDescription>
              </div>
              {incident.status !== "RESOLVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openAddResponder}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {incident.responders.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  No responders assigned
                </p>
              ) : (
                <div className="space-y-2">
                  {incident.responders.map((responder) => (
                    <div
                      key={responder.id}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {responder.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {responder.user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Responder Dialog */}
      <Dialog open={addResponderOpen} onOpenChange={setAddResponderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Responder</DialogTitle>
            <DialogDescription>
              Add a team member as a responder to this incident
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedUserId}
              onValueChange={(v) => setSelectedUserId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => !existingResponderIds.has(u.id))
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddResponderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#06AC38] hover:bg-[#059030] text-white"
              onClick={handleAddResponder}
              disabled={addingResponder || !selectedUserId}
            >
              {addingResponder ? "Adding..." : "Add Responder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
