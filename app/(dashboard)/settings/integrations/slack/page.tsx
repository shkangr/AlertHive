"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, RefreshCw, Check, Hash, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SlackConfig {
  configured: boolean;
  botToken: string;
  signingSecret: string;
  channelId: string;
  channelName: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export default function SlackSettingsPage() {
  const [config, setConfig] = useState<SlackConfig | null>(null);
  const [botToken, setBotToken] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [showBotToken, setShowBotToken] = useState(false);
  const [showSigningSecret, setShowSigningSecret] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/settings/slack");
    if (res.ok) {
      const data: SlackConfig = await res.json();
      setConfig(data);
      setBotToken(data.botToken);
      setSigningSecret(data.signingSecret);
      setChannelId(data.channelId);
      setChannelName(data.channelName);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function fetchChannels() {
    const tokenToUse = botToken.includes("••••") ? "" : botToken;
    if (!tokenToUse) {
      setError(
        "Please enter a new Bot Token to fetch channels, or use the existing configuration."
      );
      return;
    }

    setLoadingChannels(true);
    setError("");

    const res = await fetch(
      `/api/settings/slack/channels?botToken=${encodeURIComponent(tokenToUse)}`
    );

    if (res.ok) {
      const data = await res.json();
      setChannels(data);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to fetch channels");
    }
    setLoadingChannels(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    const res = await fetch("/api/settings/slack", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken,
        signingSecret,
        channelId,
        channelName,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save settings");
      return;
    }

    setSuccess(true);
    fetchConfig();
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Slack Integration
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure Slack to receive incident notifications and interact with
          incidents directly from Slack
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Slack App Configuration
                </CardTitle>
                <CardDescription>
                  Enter your Slack Bot Token and Signing Secret from your Slack
                  App settings
                </CardDescription>
              </div>
              {config?.configured && (
                <Badge className="bg-[#06AC38] text-white hover:bg-[#06AC38]">
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-[#06AC38]/10 p-3 text-sm text-[#06AC38] flex items-center gap-2">
                <Check className="h-4 w-4" />
                Settings saved successfully
              </div>
            )}

            {/* Bot Token */}
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot User OAuth Token</Label>
              <div className="relative">
                <Input
                  id="botToken"
                  type={showBotToken ? "text" : "password"}
                  placeholder="xoxb-..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowBotToken(!showBotToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showBotToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Found in your Slack App &gt; OAuth &amp; Permissions
              </p>
            </div>

            {/* Signing Secret */}
            <div className="space-y-2">
              <Label htmlFor="signingSecret">Signing Secret</Label>
              <div className="relative">
                <Input
                  id="signingSecret"
                  type={showSigningSecret ? "text" : "password"}
                  placeholder="Enter signing secret"
                  value={signingSecret}
                  onChange={(e) => setSigningSecret(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSigningSecret(!showSigningSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSigningSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Found in your Slack App &gt; Basic Information &gt; App
                Credentials
              </p>
            </div>

            {/* Channel Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Notification Channel</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={fetchChannels}
                  disabled={loadingChannels}
                >
                  <RefreshCw
                    className={`mr-1 h-3 w-3 ${loadingChannels ? "animate-spin" : ""}`}
                  />
                  {loadingChannels ? "Loading..." : "Fetch Channels"}
                </Button>
              </div>
              {channels.length > 0 ? (
                <Select
                  value={channelId}
                  onValueChange={(v) => {
                    setChannelId(v ?? "");
                    const ch = channels.find((c) => c.id === v);
                    setChannelName(ch?.name || "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <span className="flex items-center gap-1.5">
                          {ch.is_private ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Hash className="h-3 w-3" />
                          )}
                          {ch.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Channel ID (e.g., C0123456789)"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    required
                  />
                  {channelName && (
                    <p className="text-xs text-muted-foreground">
                      Current channel: #{channelName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter a channel ID manually, or click &quot;Fetch
                    Channels&quot; to select from a list
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="bg-[#06AC38] hover:bg-[#059030] text-white"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
