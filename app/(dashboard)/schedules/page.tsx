"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";

interface OnCallUser {
  userId: string;
  userName: string;
  layerName: string;
}

interface Schedule {
  id: string;
  name: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  layers: {
    id: string;
    name: string;
    rotationType: string;
    participants: { id: string; userId: string }[];
  }[];
  _count: { overrides: number };
}

const rotationLabels: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  CUSTOM: "Custom",
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [onCallMap, setOnCallMap] = useState<Record<string, OnCallUser[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules");
    if (res.ok) {
      const data: Schedule[] = await res.json();
      setSchedules(data);

      // Fetch current on-call for each schedule
      const map: Record<string, OnCallUser[]> = {};
      await Promise.all(
        data.map(async (s) => {
          const r = await fetch(`/api/schedules/${s.id}/oncall`);
          if (r.ok) {
            const result = await r.json();
            map[s.id] = result.onCallUsers || [];
          }
        })
      );
      setOnCallMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            On-Call Schedules
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage on-call rotations and schedules
          </p>
        </div>
        <Button
          className="bg-[#06AC38] hover:bg-[#059030] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading…
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No schedules yet</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first schedule
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Layers</TableHead>
                <TableHead>Currently On-Call</TableHead>
                <TableHead className="text-right">Overrides</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const onCall = onCallMap[schedule.id] || [];
                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <Link
                        href={`/schedules/${schedule.id}`}
                        className="font-medium text-foreground hover:text-[#06AC38] hover:underline"
                      >
                        {schedule.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {schedule.timezone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {schedule.layers.map((layer) => (
                          <Badge
                            key={layer.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {layer.name} · {rotationLabels[layer.rotationType] || layer.rotationType}
                          </Badge>
                        ))}
                        {schedule.layers.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            No layers
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {onCall.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {onCall.map((u) => (
                            <Badge
                              key={u.userId}
                              className="bg-[#06AC38] text-white hover:bg-[#06AC38] text-xs"
                            >
                              {u.userName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {schedule._count.overrides}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchSchedules}
      />
    </div>
  );
}
