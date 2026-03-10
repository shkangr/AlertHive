"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  service?: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    teamId?: string | null;
    escalationPolicyId?: string | null;
    team?: { id: string; name: string } | null;
    escalationPolicy?: { id: string; name: string } | null;
  } | null;
}

interface Option {
  id: string;
  name: string;
}

export function CreateServiceDialog({
  open,
  onOpenChange,
  onCreated,
  service,
}: CreateServiceDialogProps) {
  const isEditing = !!service;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [escalationPolicyId, setEscalationPolicyId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [teams, setTeams] = useState<Option[]>([]);
  const [policies, setPolicies] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/teams")
        .then((r) => (r.ok ? r.json() : []))
        .then(setTeams)
        .catch(() => setTeams([]));
      fetch("/api/escalation-policies")
        .then((r) => (r.ok ? r.json() : []))
        .then(setPolicies)
        .catch(() => setPolicies([]));
    }
  }, [open]);

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || "");
      setTeamId(service.team?.id || service.teamId || "");
      setEscalationPolicyId(
        service.escalationPolicy?.id || service.escalationPolicyId || ""
      );
      setStatus(service.status);
    } else {
      setName("");
      setDescription("");
      setTeamId("");
      setEscalationPolicyId("");
      setStatus("ACTIVE");
    }
    setError("");
  }, [service, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      name,
      description,
      teamId: teamId || null,
      escalationPolicyId: escalationPolicyId || null,
      ...(isEditing ? { status } : {}),
    };

    const url = isEditing ? `/api/services/${service!.id}` : "/api/services";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save service");
      return;
    }

    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service" : "New Service"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the service configuration"
              : "Create a new service to receive alerts"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="serviceName">Name</Label>
              <Input
                id="serviceName"
                placeholder="e.g. Payment Gateway"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceDescription">Description</Label>
              <Input
                id="serviceDescription"
                placeholder="Brief description of this service"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "ACTIVE")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={(v) => setTeamId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Escalation Policy</Label>
              <Select
                value={escalationPolicyId}
                onValueChange={(v) => setEscalationPolicyId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a policy (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No policy</SelectItem>
                  {policies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#06AC38] hover:bg-[#059030] text-white"
              disabled={saving}
            >
              {saving
                ? isEditing
                  ? "Saving…"
                  : "Creating…"
                : isEditing
                  ? "Save Changes"
                  : "Create Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
