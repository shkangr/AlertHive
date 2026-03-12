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
  BookOpen,
  Terminal,
  Hash,
  Lock,
  RefreshCw,
  MessageSquare,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [usageGuideIntegration, setUsageGuideIntegration] = useState<Integration | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Slack channel config
  const [slackChannelId, setSlackChannelId] = useState("");
  const [slackChannelName, setSlackChannelName] = useState("");
  const [slackChannels, setSlackChannels] = useState<{ id: string; name: string; is_private: boolean }[]>([]);
  const [loadingSlackChannels, setLoadingSlackChannels] = useState(false);
  const [savingSlack, setSavingSlack] = useState(false);
  const [slackSuccess, setSlackSuccess] = useState(false);
  const [slackError, setSlackError] = useState("");

  const fetchService = useCallback(async () => {
    const res = await fetch(`/api/services/${id}`);
    if (res.ok) {
      setService(await res.json());
    }
    setLoading(false);
  }, [id]);

  const fetchSlackConfig = useCallback(async () => {
    const res = await fetch(`/api/services/${id}/slack`);
    if (res.ok) {
      const data = await res.json();
      setSlackChannelId(data.channelId);
      setSlackChannelName(data.channelName);
    }
  }, [id]);

  useEffect(() => {
    fetchService();
    fetchSlackConfig();
  }, [fetchService, fetchSlackConfig]);

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
      const created: Integration = await res.json();
      setAddIntegrationOpen(false);
      setIntegrationName("");
      setUsageGuideIntegration(created);
      fetchService();
    }
  }

  function copySnippet(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }

  function getEndpointUrl(key: string) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
    return `${base}/api/integrations/${key}`;
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this service?")) return;

    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/services");
    }
  }

  async function fetchSlackChannels() {
    setLoadingSlackChannels(true);
    setSlackError("");
    const res = await fetch(`/api/services/${id}/slack/channels`);
    if (res.ok) {
      setSlackChannels(await res.json());
    } else {
      const data = await res.json();
      setSlackError(data.error || "Failed to fetch channels");
    }
    setLoadingSlackChannels(false);
  }

  async function handleSaveSlackChannel(e: React.FormEvent) {
    e.preventDefault();
    setSavingSlack(true);
    setSlackError("");
    setSlackSuccess(false);

    const res = await fetch(`/api/services/${id}/slack`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: slackChannelId, channelName: slackChannelName }),
    });

    setSavingSlack(false);
    if (!res.ok) {
      const data = await res.json();
      setSlackError(data.error || "Failed to save");
      return;
    }
    setSlackSuccess(true);
    setTimeout(() => setSlackSuccess(false), 3000);
  }

  async function handleRemoveSlackChannel() {
    const res = await fetch(`/api/services/${id}/slack`, { method: "DELETE" });
    if (res.ok) {
      setSlackChannelId("");
      setSlackChannelName("");
      setSlackSuccess(true);
      setTimeout(() => setSlackSuccess(false), 3000);
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
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setUsageGuideIntegration(integration)}
                    >
                      <BookOpen className="mr-1 h-3 w-3" />
                      Usage Guide
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slack Notification Channel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Slack Notifications
            </CardTitle>
            <CardDescription>
              {slackChannelId
                ? `Notifications for this service go to #${slackChannelName || slackChannelId}`
                : "Using global default channel. Set a channel to override."}
            </CardDescription>
          </div>
          {slackChannelId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleRemoveSlackChannel}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reset to Global
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {slackError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
              {slackError}
            </div>
          )}
          {slackSuccess && (
            <div className="rounded-md bg-[#06AC38]/10 p-3 text-sm text-[#06AC38] flex items-center gap-2 mb-4">
              <Check className="h-4 w-4" />
              Saved successfully
            </div>
          )}
          <form onSubmit={handleSaveSlackChannel}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Notification Channel</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={fetchSlackChannels}
                  disabled={loadingSlackChannels}
                >
                  <RefreshCw
                    className={`mr-1 h-3 w-3 ${loadingSlackChannels ? "animate-spin" : ""}`}
                  />
                  {loadingSlackChannels ? "Loading..." : "Fetch Channels"}
                </Button>
              </div>
              {slackChannels.length > 0 ? (
                <Select
                  value={slackChannelId}
                  onValueChange={(v) => {
                    setSlackChannelId(v ?? "");
                    const ch = slackChannels.find((c) => c.id === v);
                    setSlackChannelName(ch?.name || "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {slackChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <span className="flex items-center gap-1.5">
                          {ch.is_private ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Hash className="h-3 w-3" />
                          )}
                          {ch.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Channel ID (e.g., C0123456789)"
                    value={slackChannelId}
                    onChange={(e) => setSlackChannelId(e.target.value)}
                  />
                  {slackChannelName && !slackChannels.length && (
                    <p className="text-xs text-muted-foreground">
                      Current channel: #{slackChannelName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter a channel ID manually, or click &quot;Fetch Channels&quot; to
                    select from a list
                  </p>
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#06AC38] hover:bg-[#059030] text-white"
                  disabled={savingSlack}
                >
                  {savingSlack ? "Saving..." : "Save Channel"}
                </Button>
              </div>
            </div>
          </form>
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

      {/* Integration Usage Guide Dialog */}
      <Dialog
        open={!!usageGuideIntegration}
        onOpenChange={(open) => !open && setUsageGuideIntegration(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {usageGuideIntegration?.name} — Usage Guide
            </DialogTitle>
            <DialogDescription>
              Send events to this integration to create incidents on{" "}
              <span className="font-medium text-foreground">{service.name}</span>
            </DialogDescription>
          </DialogHeader>

          {usageGuideIntegration && (
            <div className="space-y-5 py-2">
              {/* Endpoint */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Endpoint
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                    POST {getEndpointUrl(usageGuideIntegration.integrationKey)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() =>
                      copySnippet(
                        getEndpointUrl(usageGuideIntegration.integrationKey),
                        "endpoint"
                      )
                    }
                  >
                    {copiedSnippet === "endpoint" ? (
                      <Check className="h-4 w-4 text-[#06AC38]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Tabs: cURL / JavaScript / Python */}
              <Tabs defaultValue="curl">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Example Request
                  </Label>
                  <TabsList className="h-8">
                    <TabsTrigger value="curl" className="text-xs px-3 h-6">cURL</TabsTrigger>
                    <TabsTrigger value="javascript" className="text-xs px-3 h-6">JavaScript</TabsTrigger>
                    <TabsTrigger value="python" className="text-xs px-3 h-6">Python</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="curl" className="mt-2">
                  <div className="relative">
                    <pre className="rounded-md bg-[#1e1e2e] p-4 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre">
{`curl -X POST \\
  ${getEndpointUrl(usageGuideIntegration.integrationKey)} \\
  -H "Content-Type: application/json" \\
  -d '{
    "summary": "High CPU usage on web-server-01",
    "severity": "CRITICAL",
    "dedupKey": "cpu-high-web-01",
    "rawPayload": {
      "source": "monitoring-agent",
      "metric": "cpu.usage",
      "value": 98.5
    }
  }'`}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 text-gray-400 hover:text-white"
                      onClick={() =>
                        copySnippet(
                          `curl -X POST \\\n  ${getEndpointUrl(usageGuideIntegration.integrationKey)} \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "summary": "High CPU usage on web-server-01",\n    "severity": "CRITICAL",\n    "dedupKey": "cpu-high-web-01",\n    "rawPayload": {\n      "source": "monitoring-agent",\n      "metric": "cpu.usage",\n      "value": 98.5\n    }\n  }'`,
                          "curl"
                        )
                      }
                    >
                      {copiedSnippet === "curl" ? (
                        <Check className="h-3.5 w-3.5 text-[#06AC38]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="javascript" className="mt-2">
                  <div className="relative">
                    <pre className="rounded-md bg-[#1e1e2e] p-4 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre">
{`const response = await fetch(
  "${getEndpointUrl(usageGuideIntegration.integrationKey)}",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: "High CPU usage on web-server-01",
      severity: "CRITICAL",
      dedupKey: "cpu-high-web-01",
      rawPayload: {
        source: "monitoring-agent",
        metric: "cpu.usage",
        value: 98.5,
      },
    }),
  }
);

const data = await response.json();
console.log(data);`}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 text-gray-400 hover:text-white"
                      onClick={() =>
                        copySnippet(
                          `const response = await fetch(\n  "${getEndpointUrl(usageGuideIntegration.integrationKey)}",\n  {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({\n      summary: "High CPU usage on web-server-01",\n      severity: "CRITICAL",\n      dedupKey: "cpu-high-web-01",\n      rawPayload: {\n        source: "monitoring-agent",\n        metric: "cpu.usage",\n        value: 98.5,\n      },\n    }),\n  }\n);\n\nconst data = await response.json();\nconsole.log(data);`,
                          "javascript"
                        )
                      }
                    >
                      {copiedSnippet === "javascript" ? (
                        <Check className="h-3.5 w-3.5 text-[#06AC38]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="python" className="mt-2">
                  <div className="relative">
                    <pre className="rounded-md bg-[#1e1e2e] p-4 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre">
{`import requests

response = requests.post(
    "${getEndpointUrl(usageGuideIntegration.integrationKey)}",
    json={
        "summary": "High CPU usage on web-server-01",
        "severity": "CRITICAL",
        "dedupKey": "cpu-high-web-01",
        "rawPayload": {
            "source": "monitoring-agent",
            "metric": "cpu.usage",
            "value": 98.5,
        },
    },
)

print(response.json())`}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 text-gray-400 hover:text-white"
                      onClick={() =>
                        copySnippet(
                          `import requests\n\nresponse = requests.post(\n    "${getEndpointUrl(usageGuideIntegration.integrationKey)}",\n    json={\n        "summary": "High CPU usage on web-server-01",\n        "severity": "CRITICAL",\n        "dedupKey": "cpu-high-web-01",\n        "rawPayload": {\n            "source": "monitoring-agent",\n            "metric": "cpu.usage",\n            "value": 98.5,\n        },\n    },\n)\n\nprint(response.json())`,
                          "python"
                        )
                      }
                    >
                      {copiedSnippet === "python" ? (
                        <Check className="h-3.5 w-3.5 text-[#06AC38]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Payload Reference */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payload Reference
                </Label>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Field</th>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                        <th className="px-3 py-2 text-left font-medium">Required</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-3 py-2 font-mono text-xs">summary</td>
                        <td className="px-3 py-2 text-muted-foreground">string</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="text-xs">Required</Badge></td>
                        <td className="px-3 py-2 text-muted-foreground">Alert summary — becomes the incident title</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 font-mono text-xs">severity</td>
                        <td className="px-3 py-2 text-muted-foreground">enum</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">Optional</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <code className="text-xs">CRITICAL</code> | <code className="text-xs">ERROR</code> | <code className="text-xs">WARNING</code> | <code className="text-xs">INFO</code> — defaults to ERROR
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 font-mono text-xs">dedupKey</td>
                        <td className="px-3 py-2 text-muted-foreground">string</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">Optional</td>
                        <td className="px-3 py-2 text-muted-foreground">Deduplication key — same key updates existing open alert instead of creating a new one</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-xs">rawPayload</td>
                        <td className="px-3 py-2 text-muted-foreground">object</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">Optional</td>
                        <td className="px-3 py-2 text-muted-foreground">Arbitrary JSON metadata stored with the alert</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Severity → Urgency mapping */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Severity → Urgency Mapping
                </Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-[#CC0000]" />
                    <span className="font-mono text-xs">CRITICAL / ERROR</span>
                    <span className="ml-auto text-muted-foreground">→ HIGH urgency</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-[#FAB436]" />
                    <span className="font-mono text-xs">WARNING / INFO</span>
                    <span className="ml-auto text-muted-foreground">→ LOW urgency</span>
                  </div>
                </div>
              </div>

              {/* Response examples */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Response
                </Label>
                <div className="rounded-md bg-[#1e1e2e] p-4 text-sm font-mono overflow-x-auto">
                  <p className="text-gray-400 mb-1">// 201 Created — new incident</p>
                  <pre className="text-green-400 whitespace-pre">
{`{
  "message": "Alert created",
  "alertId": "clx...",
  "incidentId": "clx...",
  "deduplicated": false
}`}
                  </pre>
                  <p className="text-gray-400 mt-3 mb-1">// 200 OK — deduplicated (existing open alert updated)</p>
                  <pre className="text-yellow-400 whitespace-pre">
{`{
  "message": "Alert updated (dedup)",
  "alertId": "clx...",
  "incidentId": "clx...",
  "deduplicated": true
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
