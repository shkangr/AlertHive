"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  Pencil,
  Trash2,
  User,
  CalendarDays,
  Clock,
} from "lucide-react";
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
import { CreatePolicyDialog } from "@/components/escalation/create-policy-dialog";

interface EscalationTarget {
  id: string;
  targetType: string;
  user: { id: string; name: string; email: string } | null;
  schedule: { id: string; name: string } | null;
}

interface EscalationRule {
  id: string;
  order: number;
  timeoutMinutes: number;
  targets: EscalationTarget[];
}

interface PolicyDetail {
  id: string;
  name: string;
  description: string | null;
  repeatCount: number;
  createdAt: string;
  updatedAt: string;
  rules: EscalationRule[];
  services: { id: string; name: string; status: string }[];
  _count: { services: number };
}

const statusConfig: Record<string, { label: string; className: string }> = {
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

export default function EscalationPolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchPolicy = useCallback(async () => {
    const res = await fetch(`/api/escalation-policies/${id}`);
    if (res.ok) {
      setPolicy(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this escalation policy?"))
      return;

    const res = await fetch(`/api/escalation-policies/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/escalation-policies");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Policy not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/escalation-policies")}
        >
          Back to Escalation Policies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/escalation-policies"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Escalation Policies
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {policy.name}
          </h1>
          {policy.description && (
            <p className="text-sm text-muted-foreground">
              {policy.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
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
            <CardDescription>Steps</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {policy.rules.length}{" "}
              {policy.rules.length === 1 ? "step" : "steps"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Repeat Count</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{policy.repeatCount}x</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Linked Services</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{policy._count.services}</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalation Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escalation Steps</CardTitle>
          <CardDescription>
            How incidents are escalated through your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policy.rules.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No escalation steps defined
            </p>
          ) : (
            <div className="space-y-0">
              {policy.rules.map((rule, index) => (
                <div key={rule.id}>
                  <div className="flex items-start gap-4 rounded-lg border p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06AC38] text-sm font-bold text-white">
                      {rule.order + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Step {rule.order + 1}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {rule.timeoutMinutes} min timeout
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {rule.targets.map((target) => (
                          <div
                            key={target.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            {target.targetType === "USER" ? (
                              <>
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{target.user?.name || "Unknown"}</span>
                                {target.user?.email && (
                                  <span className="text-xs text-muted-foreground">
                                    ({target.user.email})
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>
                                  {target.schedule?.name || "Unknown Schedule"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  Schedule
                                </Badge>
                              </>
                            )}
                          </div>
                        ))}
                        {rule.targets.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No targets assigned
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < policy.rules.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked Services</CardTitle>
          <CardDescription>
            Services using this escalation policy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policy.services.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No services linked to this policy
            </p>
          ) : (
            <div className="space-y-2">
              {policy.services.map((service) => {
                const sc =
                  statusConfig[service.status] || statusConfig.ACTIVE;
                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <Link
                      href={`/services/${service.id}`}
                      className="text-sm font-medium hover:text-[#06AC38] hover:underline"
                    >
                      {service.name}
                    </Link>
                    <Badge className={sc.className}>{sc.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CreatePolicyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onCreated={fetchPolicy}
        policy={policy}
      />
    </div>
  );
}
