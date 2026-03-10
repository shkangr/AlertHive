"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function NotificationsPage() {
  const [slackUserId, setSlackUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        setSlackUserId(data.slackUserId || "");
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: "error", text: "Failed to load settings" });
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    const res = await fetch("/api/user/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackUserId }),
    });

    setSaving(false);

    if (res.ok) {
      setMessage({
        type: "success",
        text: "Notification settings updated",
      });
    } else {
      const data = await res.json();
      setMessage({
        type: "error",
        text: data.error || "Failed to update settings",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notification Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure how you receive alerts
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Notification Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure how you receive alerts
        </p>
      </div>
      <Separator />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>
            Connect your Slack account to receive incident notifications via
            direct message
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`rounded-md p-3 text-sm ${
                  message.type === "success"
                    ? "bg-[#06AC38]/10 text-[#06AC38]"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {message.text}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="slackUserId">Slack User ID</Label>
              <Input
                id="slackUserId"
                placeholder="U0123456789"
                value={slackUserId}
                onChange={(e) => setSlackUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your Slack Member ID in your Slack profile → More →
                Copy member ID
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="bg-[#06AC38] hover:bg-[#059030] text-white"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
