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

interface User {
  id: string;
  name: string;
  email: string;
}

interface AddOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  onCreated: () => void;
}

function getDefaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function getDefaultEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function AddOverrideDialog({
  open,
  onOpenChange,
  scheduleId,
  onCreated,
}: AddOverrideDialogProps) {
  const [userId, setUserId] = useState("");
  const [startTime, setStartTime] = useState(getDefaultStart());
  const [endTime, setEndTime] = useState(getDefaultEnd());
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/users")
        .then((r) => (r.ok ? r.json() : []))
        .then(setUsers)
        .catch(() => setUsers([]));

      setUserId("");
      setStartTime(getDefaultStart());
      setEndTime(getDefaultEnd());
      setError("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!userId) {
      setError("Please select a person");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/schedules/${scheduleId}/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create override");
      return;
    }

    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Override</DialogTitle>
          <DialogDescription>
            Temporarily assign on-call to someone for a specific time range
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
              <Label>Override person</Label>
              <Select
                value={userId}
                onValueChange={(v) => setUserId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a person…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overrideStart">Start time</Label>
              <Input
                id="overrideStart"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overrideEnd">End time</Label>
              <Input
                id="overrideEnd"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
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
              {saving ? "Creating…" : "Create Override"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
