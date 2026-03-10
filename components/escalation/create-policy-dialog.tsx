"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, User, CalendarDays } from "lucide-react";
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

interface TargetForm {
  targetType: "USER" | "SCHEDULE";
  userId?: string;
  scheduleId?: string;
}

interface RuleForm {
  order: number;
  timeoutMinutes: number;
  targets: TargetForm[];
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface ScheduleOption {
  id: string;
  name: string;
}

interface CreatePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  policy?: {
    id: string;
    name: string;
    description: string | null;
    repeatCount: number;
    rules: {
      id: string;
      order: number;
      timeoutMinutes: number;
      targets: {
        id: string;
        targetType: string;
        user: { id: string; name: string; email: string } | null;
        schedule: { id: string; name: string } | null;
      }[];
    }[];
  } | null;
}

function createEmptyTarget(): TargetForm {
  return { targetType: "USER", userId: "", scheduleId: "" };
}

function createEmptyRule(order: number): RuleForm {
  return {
    order,
    timeoutMinutes: 30,
    targets: [createEmptyTarget()],
  };
}

export function CreatePolicyDialog({
  open,
  onOpenChange,
  onCreated,
  policy,
}: CreatePolicyDialogProps) {
  const isEditing = !!policy;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repeatCount, setRepeatCount] = useState(1);
  const [rules, setRules] = useState<RuleForm[]>([createEmptyRule(0)]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/users")
        .then((r) => (r.ok ? r.json() : []))
        .then(setUsers)
        .catch(() => setUsers([]));
      fetch("/api/schedules")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const items = Array.isArray(data) ? data : data.schedules || [];
          setSchedules(items);
        })
        .catch(() => setSchedules([]));
    }
  }, [open]);

  useEffect(() => {
    if (policy) {
      setName(policy.name);
      setDescription(policy.description || "");
      setRepeatCount(policy.repeatCount);
      setRules(
        policy.rules.length > 0
          ? policy.rules.map((r) => ({
              order: r.order,
              timeoutMinutes: r.timeoutMinutes,
              targets:
                r.targets.length > 0
                  ? r.targets.map((t) => ({
                      targetType: t.targetType as "USER" | "SCHEDULE",
                      userId: t.user?.id || "",
                      scheduleId: t.schedule?.id || "",
                    }))
                  : [createEmptyTarget()],
            }))
          : [createEmptyRule(0)]
      );
    } else {
      setName("");
      setDescription("");
      setRepeatCount(1);
      setRules([createEmptyRule(0)]);
    }
    setError("");
  }, [policy, open]);

  function addRule() {
    setRules((prev) => [...prev, createEmptyRule(prev.length)]);
  }

  function removeRule(index: number) {
    setRules((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((r, i) => ({ ...r, order: i }));
    });
  }

  function updateRule(index: number, field: string, value: number) {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addTarget(ruleIndex: number) {
    setRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex
          ? { ...r, targets: [...r.targets, createEmptyTarget()] }
          : r
      )
    );
  }

  function removeTarget(ruleIndex: number, targetIndex: number) {
    setRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex
          ? { ...r, targets: r.targets.filter((_, ti) => ti !== targetIndex) }
          : r
      )
    );
  }

  function updateTarget(
    ruleIndex: number,
    targetIndex: number,
    updates: Partial<TargetForm>
  ) {
    setRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex
          ? {
              ...r,
              targets: r.targets.map((t, ti) =>
                ti === targetIndex ? { ...t, ...updates } : t
              ),
            }
          : r
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      name,
      description,
      repeatCount,
      rules: rules.map((r, i) => ({
        order: i,
        timeoutMinutes: r.timeoutMinutes,
        targets: r.targets
          .filter((t) => {
            if (t.targetType === "USER") return !!t.userId;
            return !!t.scheduleId;
          })
          .map((t) => ({
            targetType: t.targetType,
            userId: t.targetType === "USER" ? t.userId : undefined,
            scheduleId: t.targetType === "SCHEDULE" ? t.scheduleId : undefined,
          })),
      })),
    };

    const url = isEditing
      ? `/api/escalation-policies/${policy!.id}`
      : "/api/escalation-policies";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save policy");
      return;
    }

    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Escalation Policy" : "New Escalation Policy"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the escalation policy configuration"
              : "Create a new escalation policy to define how incidents are escalated"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="policyName">Policy Name</Label>
                <Input
                  id="policyName"
                  placeholder="e.g. Primary On-Call"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyDescription">Description</Label>
                <Input
                  id="policyDescription"
                  placeholder="Brief description of this policy"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeatCount">
                  Number of times to repeat escalation
                </Label>
                <Input
                  id="repeatCount"
                  type="number"
                  min={1}
                  max={10}
                  value={repeatCount}
                  onChange={(e) =>
                    setRepeatCount(parseInt(e.target.value) || 1)
                  }
                />
              </div>
            </div>

            {/* Escalation Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Escalation Steps
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRule}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Step
                </Button>
              </div>

              {rules.map((rule, ruleIndex) => (
                <div
                  key={ruleIndex}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06AC38] text-xs font-bold text-white">
                        {ruleIndex + 1}
                      </div>
                      <span className="text-sm font-medium">
                        Step {ruleIndex + 1}
                      </span>
                    </div>
                    {rules.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeRule(ruleIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">
                      Escalate after (minutes)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={rule.timeoutMinutes}
                      onChange={(e) =>
                        updateRule(
                          ruleIndex,
                          "timeoutMinutes",
                          parseInt(e.target.value) || 30
                        )
                      }
                      className="w-32"
                    />
                  </div>

                  {/* Targets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Targets</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addTarget(ruleIndex)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Target
                      </Button>
                    </div>

                    {rule.targets.map((target, targetIndex) => (
                      <div
                        key={targetIndex}
                        className="flex items-center gap-2"
                      >
                        <Select
                          value={target.targetType}
                          onValueChange={(v) =>
                            updateTarget(ruleIndex, targetIndex, {
                              targetType: v as "USER" | "SCHEDULE",
                              userId: "",
                              scheduleId: "",
                            })
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">
                              <span className="flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                User
                              </span>
                            </SelectItem>
                            <SelectItem value="SCHEDULE">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3" />
                                Schedule
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {target.targetType === "USER" ? (
                          <Select
                            value={target.userId || ""}
                            onValueChange={(v) =>
                              updateTarget(ruleIndex, targetIndex, {
                                userId: v ?? "",
                              })
                            }
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name} ({u.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={target.scheduleId || ""}
                            onValueChange={(v) =>
                              updateTarget(ruleIndex, targetIndex, {
                                scheduleId: v ?? "",
                              })
                            }
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select schedule" />
                            </SelectTrigger>
                            <SelectContent>
                              {schedules.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {rule.targets.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() =>
                              removeTarget(ruleIndex, targetIndex)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
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
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
