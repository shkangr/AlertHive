"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";

interface User {
  id: string;
  name: string;
  email: string;
}

interface LayerForm {
  name: string;
  rotationType: string;
  shiftDuration: number;
  startTime: string;
  participantIds: string[];
}

interface ScheduleData {
  id: string;
  name: string;
  timezone: string;
  layers: {
    id: string;
    name: string;
    order: number;
    rotationType: string;
    shiftDuration: number;
    startTime: string;
    participants: { id: string; userId: string; order: number }[];
  }[];
}

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  schedule?: ScheduleData | null;
}

const defaultLayer = (): LayerForm => ({
  name: "Layer 1",
  rotationType: "WEEKLY",
  shiftDuration: 168,
  startTime: new Date().toISOString().slice(0, 16),
  participantIds: [],
});

const timezones = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "UTC",
];

export function CreateScheduleDialog({
  open,
  onOpenChange,
  onCreated,
  schedule,
}: CreateScheduleDialogProps) {
  const isEditing = !!schedule;

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [layers, setLayers] = useState<LayerForm[]>([defaultLayer()]);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/users")
        .then((r) => (r.ok ? r.json() : []))
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [open]);

  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setTimezone(schedule.timezone);
      setLayers(
        schedule.layers.map((l) => ({
          name: l.name,
          rotationType: l.rotationType,
          shiftDuration: l.shiftDuration,
          startTime: new Date(l.startTime).toISOString().slice(0, 16),
          participantIds: l.participants.map((p) => p.userId),
        }))
      );
    } else {
      setName("");
      setTimezone("Asia/Seoul");
      setLayers([defaultLayer()]);
    }
    setError("");
  }, [schedule, open]);

  function updateLayer(index: number, updates: Partial<LayerForm>) {
    setLayers((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates } : l))
    );
  }

  function addLayer() {
    setLayers((prev) => [
      ...prev,
      {
        ...defaultLayer(),
        name: `Layer ${prev.length + 1}`,
      },
    ]);
  }

  function removeLayer(index: number) {
    setLayers((prev) => prev.filter((_, i) => i !== index));
  }

  function addParticipant(layerIndex: number, userId: string) {
    if (!userId) return;
    setLayers((prev) =>
      prev.map((l, i) =>
        i === layerIndex && !l.participantIds.includes(userId)
          ? { ...l, participantIds: [...l.participantIds, userId] }
          : l
      )
    );
  }

  function removeParticipant(layerIndex: number, userId: string) {
    setLayers((prev) =>
      prev.map((l, i) =>
        i === layerIndex
          ? {
              ...l,
              participantIds: l.participantIds.filter((id) => id !== userId),
            }
          : l
      )
    );
  }

  function handleRotationChange(index: number, rotationType: string) {
    const shiftMap: Record<string, number> = {
      DAILY: 24,
      WEEKLY: 168,
      CUSTOM: 12,
    };
    updateLayer(index, {
      rotationType,
      shiftDuration: shiftMap[rotationType] || 168,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      name,
      timezone,
      layers: layers.map((l) => ({
        name: l.name,
        rotationType: l.rotationType,
        shiftDuration: l.shiftDuration,
        startTime: new Date(l.startTime).toISOString(),
        participants: l.participantIds.map((userId) => ({ userId })),
      })),
    };

    const url = isEditing ? `/api/schedules/${schedule!.id}` : "/api/schedules";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save schedule");
      return;
    }

    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Schedule" : "New Schedule"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update schedule configuration and layers"
              : "Create an on-call rotation schedule"}
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
              <Label htmlFor="scheduleName">Schedule name</Label>
              <Input
                id="scheduleName"
                placeholder="e.g. Primary On-Call"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={timezone}
                onValueChange={(v) => setTimezone(v ?? "Asia/Seoul")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Layers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Layers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLayer}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Layer
                </Button>
              </div>

              {layers.map((layer, li) => (
                <div
                  key={li}
                  className="rounded-md border p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Input
                      value={layer.name}
                      onChange={(e) =>
                        updateLayer(li, { name: e.target.value })
                      }
                      className="h-7 text-sm font-medium w-auto max-w-[180px]"
                    />
                    {layers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                        onClick={() => removeLayer(li)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Rotation</Label>
                      <Select
                        value={layer.rotationType}
                        onValueChange={(v) =>
                          handleRotationChange(li, v ?? "WEEKLY")
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {layer.rotationType === "CUSTOM" && (
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Shift duration (hours)
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          value={layer.shiftDuration}
                          onChange={(e) =>
                            updateLayer(li, {
                              shiftDuration: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Start time</Label>
                    <Input
                      type="datetime-local"
                      className="h-8"
                      value={layer.startTime}
                      onChange={(e) =>
                        updateLayer(li, { startTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Participants</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {layer.participantIds.map((uid) => {
                        const user = users.find((u) => u.id === uid);
                        return (
                          <Badge
                            key={uid}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            {user?.name || uid}
                            <button
                              type="button"
                              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                              onClick={() => removeParticipant(li, uid)}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                    <Select
                      value=""
                      onValueChange={(v) => addParticipant(li, v ?? "")}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Add participant…" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(
                            (u) => !layer.participantIds.includes(u.id)
                          )
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
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
                  : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
