"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface EscalationPolicy {
  id: string;
  name: string;
  description: string | null;
  repeatCount: number;
  createdAt: string;
  updatedAt: string;
  rules: EscalationRule[];
  _count: { services: number };
}

export default function EscalationPoliciesPage() {
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPolicies = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    const res = await fetch(`/api/escalation-policies?${params}`);
    if (res.ok) {
      setPolicies(await res.json());
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Escalation Policies
          </h1>
          <p className="text-sm text-muted-foreground">
            Define how incidents are escalated through your team
          </p>
        </div>
        <Button
          className="bg-[#06AC38] hover:bg-[#059030] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Escalation Policy
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ArrowUpRight className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No escalation policies found
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first escalation policy
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Repeat</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead className="text-right">Services</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => {
                const targetSummary = policy.rules
                  .flatMap((r) => r.targets)
                  .map((t) =>
                    t.targetType === "USER"
                      ? t.user?.name
                      : t.schedule?.name
                  )
                  .filter(Boolean);
                const uniqueTargets = [...new Set(targetSummary)];

                return (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <Link
                        href={`/escalation-policies/${policy.id}`}
                        className="font-medium text-foreground hover:text-[#06AC38] hover:underline"
                      >
                        {policy.name}
                      </Link>
                      {policy.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                          {policy.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {policy.rules.length}{" "}
                      {policy.rules.length === 1 ? "step" : "steps"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {policy.repeatCount}x
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {uniqueTargets.length > 0
                        ? uniqueTargets.slice(0, 3).join(", ") +
                          (uniqueTargets.length > 3
                            ? ` +${uniqueTargets.length - 3}`
                            : "")
                        : "No targets"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {policy._count.services}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatePolicyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchPolicies}
      />
    </div>
  );
}
