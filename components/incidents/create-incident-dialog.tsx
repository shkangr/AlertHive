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

interface ServiceOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface CreateIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateIncidentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateIncidentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [urgency, setUrgency] = useState("HIGH");
  const [assigneeId, setAssigneeId] = useState("");
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/services")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: ServiceOption[]) =>
          setServices(data.map((s) => ({ id: s.id, name: s.name })))
        )
        .catch(() => setServices([]));
      fetch("/api/users")
        .then((r) => (r.ok ? r.json() : []))
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setServiceId("");
      setUrgency("HIGH");
      setAssigneeId("");
      setError("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      title,
      description: description || null,
      serviceId,
      urgency,
      assigneeId: assigneeId || null,
    };

    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create incident");
      return;
    }

    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Incident</DialogTitle>
          <DialogDescription>
            Create a new incident to track an issue
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
              <Label htmlFor="incidentTitle">Title</Label>
              <Input
                id="incidentTitle"
                placeholder="e.g. API latency spike on payment service"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incidentDescription">Description</Label>
              <Input
                id="incidentDescription"
                placeholder="Additional details about the incident"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={serviceId}
                onValueChange={(v) => setServiceId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select
                value={urgency}
                onValueChange={(v) => setUrgency(v ?? "HIGH")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select
                value={assigneeId}
                onValueChange={(v) => setAssigneeId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignee</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
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
              disabled={saving || !serviceId}
            >
              {saving ? "Creating..." : "Create Incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
