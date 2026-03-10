"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { AddOverrideDialog } from "@/components/schedules/add-override-dialog";

interface Participant {
  id: string;
  userId: string;
  order: number;
}

interface Layer {
  id: string;
  name: string;
  order: number;
  rotationType: string;
  shiftDuration: number;
  startTime: string;
  participants: Participant[];
}

interface Override {
  id: string;
  startTime: string;
  endTime: string;
  userId: string;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

interface ScheduleDetail {
  id: string;
  name: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  layers: Layer[];
  overrides: Override[];
}

interface OnCallUser {
  userId: string;
  userName: string;
  layerName: string;
}

interface UserMap {
  [id: string]: { id: string; name: string; email: string };
}

const LAYER_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-rose-500",
  "bg-indigo-500",
];

const rotationLabels: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  CUSTOM: "Custom",
};

function getDaysInWeek(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getRotationIndex(
  layerStart: Date,
  queryTime: Date,
  rotationType: string,
  shiftDuration: number,
  participantCount: number
): number {
  if (participantCount === 0) return 0;
  const msPerHour = 3600000;
  let effectiveHours: number;
  switch (rotationType) {
    case "DAILY":
      effectiveHours = 24;
      break;
    case "WEEKLY":
      effectiveHours = 168;
      break;
    default:
      effectiveHours = shiftDuration;
  }
  const elapsed = queryTime.getTime() - layerStart.getTime();
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / (effectiveHours * msPerHour)) % participantCount;
}

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [onCall, setOnCall] = useState<OnCallUser[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchSchedule = useCallback(async () => {
    const [schedRes, oncallRes, usersRes] = await Promise.all([
      fetch(`/api/schedules/${id}`),
      fetch(`/api/schedules/${id}/oncall`),
      fetch("/api/users"),
    ]);

    if (schedRes.ok) {
      setSchedule(await schedRes.json());
    }
    if (oncallRes.ok) {
      const data = await oncallRes.json();
      setOnCall(data.onCallUsers || []);
    }
    if (usersRes.ok) {
      const uList: { id: string; name: string; email: string }[] =
        await usersRes.json();
      const map: UserMap = {};
      for (const u of uList) map[u.id] = u;
      setUsers(map);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => getDaysInWeek(baseDate), [baseDate]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/schedules");
  }

  async function handleDeleteOverride(overrideId: string) {
    const res = await fetch(
      `/api/schedules/${id}/overrides?overrideId=${overrideId}`,
      { method: "DELETE" }
    );
    if (res.ok) fetchSchedule();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Schedule not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/schedules")}
        >
          Back to Schedules
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
              href="/schedules"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Schedules
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {schedule.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {schedule.timezone}
          </div>
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

      {/* Current On-Call */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Currently On-Call</CardTitle>
        </CardHeader>
        <CardContent>
          {onCall.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {onCall.map((u) => (
                <div
                  key={u.userId}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#06AC38] text-xs font-medium text-white">
                    {u.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.layerName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No one on-call</p>
          )}
        </CardContent>
      </Card>

      {/* Calendar & Details Tabs */}
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="overrides">
            Overrides ({schedule.overrides.length})
          </TabsTrigger>
          <TabsTrigger value="layers">
            Layers ({schedule.layers.length})
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Weekly View</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset((w) => w - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(0)}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset((w) => w + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Layer legend */}
              <div className="flex flex-wrap gap-3 mb-4">
                {schedule.layers.map((layer, i) => (
                  <div key={layer.id} className="flex items-center gap-1.5">
                    <div
                      className={`h-3 w-3 rounded-sm ${LAYER_COLORS[i % LAYER_COLORS.length]}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {layer.name}
                    </span>
                  </div>
                ))}
                {schedule.overrides.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-orange-500" />
                    <span className="text-xs text-muted-foreground">
                      Override
                    </span>
                  </div>
                )}
              </div>

              {/* Calendar grid */}
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b">
                    {weekDays.map((day) => {
                      const isToday =
                        day.toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={day.toISOString()}
                          className={`px-2 py-2 text-center text-xs ${
                            isToday
                              ? "font-bold text-[#06AC38]"
                              : "text-muted-foreground"
                          }`}
                        >
                          <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                          <div className="text-sm">
                            {day.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Layer rows */}
                  {schedule.layers.map((layer, li) => (
                    <div key={layer.id} className="grid grid-cols-7 border-b">
                      {weekDays.map((day) => {
                        // Check for override on this day
                        const override = schedule.overrides.find((o) => {
                          const s = new Date(o.startTime);
                          const e = new Date(o.endTime);
                          return day >= s && day < e;
                        });

                        if (override) {
                          return (
                            <div
                              key={day.toISOString()}
                              className="border-r p-1 min-h-[48px]"
                            >
                              <div className="rounded bg-orange-500/15 border border-orange-500/30 px-1.5 py-1 text-xs">
                                <span className="font-medium text-orange-700">
                                  {override.user.name}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        // Calculate rotation
                        if (layer.participants.length === 0) {
                          return (
                            <div
                              key={day.toISOString()}
                              className="border-r p-1 min-h-[48px]"
                            />
                          );
                        }

                        const midday = new Date(day);
                        midday.setHours(12, 0, 0, 0);
                        const idx = getRotationIndex(
                          new Date(layer.startTime),
                          midday,
                          layer.rotationType,
                          layer.shiftDuration,
                          layer.participants.length
                        );
                        const participant = layer.participants[idx];
                        const user = participant
                          ? users[participant.userId]
                          : null;
                        const colorClass =
                          LAYER_COLORS[li % LAYER_COLORS.length];

                        return (
                          <div
                            key={day.toISOString()}
                            className="border-r p-1 min-h-[48px]"
                          >
                            <div
                              className={`rounded ${colorClass}/15 border px-1.5 py-1 text-xs`}
                              style={{
                                borderColor: `color-mix(in srgb, currentColor 30%, transparent)`,
                              }}
                            >
                              <span className="font-medium">
                                {user?.name || "Unknown"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {schedule.layers.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No layers configured. Add layers to see the schedule.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides Tab */}
        <TabsContent value="overrides" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Schedule Overrides</CardTitle>
                <CardDescription>
                  Temporarily swap on-call responsibility
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOverrideOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Override
              </Button>
            </CardHeader>
            <CardContent>
              {schedule.overrides.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No overrides scheduled
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.overrides.map((override) => {
                      const now = new Date();
                      const start = new Date(override.startTime);
                      const end = new Date(override.endTime);
                      const isActive = now >= start && now < end;
                      const isPast = now >= end;

                      return (
                        <TableRow key={override.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {override.user.name}
                              </span>
                              {isActive && (
                                <Badge className="bg-[#06AC38] text-white hover:bg-[#06AC38] text-xs">
                                  Active
                                </Badge>
                              )}
                              {isPast && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  Past
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {start.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {end.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                handleDeleteOverride(override.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layers Tab */}
        <TabsContent value="layers" className="mt-4">
          <div className="space-y-4">
            {schedule.layers.map((layer, li) => (
              <Card key={layer.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-sm ${LAYER_COLORS[li % LAYER_COLORS.length]}`}
                    />
                    <CardTitle className="text-base">{layer.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {rotationLabels[layer.rotationType] || layer.rotationType}
                    </Badge>
                  </div>
                  <CardDescription>
                    {layer.rotationType === "CUSTOM"
                      ? `${layer.shiftDuration}h shift`
                      : layer.rotationType === "DAILY"
                        ? "24h shift"
                        : "7-day shift"}{" "}
                    · Started{" "}
                    {new Date(layer.startTime).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {layer.participants.map((p, pi) => {
                      const user = users[p.userId];
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 rounded-md border px-3 py-1.5"
                        >
                          <span className="text-xs text-muted-foreground">
                            #{pi + 1}
                          </span>
                          <span className="text-sm font-medium">
                            {user?.name || p.userId}
                          </span>
                        </div>
                      );
                    })}
                    {layer.participants.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No participants
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {schedule.layers.length === 0 && (
              <div className="flex flex-col items-center py-8">
                <p className="text-sm text-muted-foreground">
                  No layers configured
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit Schedule
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateScheduleDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onCreated={fetchSchedule}
        schedule={schedule}
      />

      <AddOverrideDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        scheduleId={id}
        onCreated={fetchSchedule}
      />
    </div>
  );
}
