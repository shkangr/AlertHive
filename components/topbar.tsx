"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export function Topbar({ breadcrumbs }: TopbarProps) {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4 lg:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        {/* Spacer for mobile menu button */}
        <div className="w-8 lg:hidden" />

        {breadcrumbs && breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              )}
            </span>
          ))
        ) : (
          <span className="font-medium text-foreground">Dashboard</span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" />
        </button>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-muted">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#06AC38] text-xs text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {session?.user?.name && (
              <>
                <div className="px-2 py-1.5 text-sm font-medium">
                  {session.user.name}
                </div>
                <div className="px-2 pb-1.5 text-xs text-muted-foreground">
                  {session.user.email}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => (window.location.href = "/settings/profile")}
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                (window.location.href = "/settings/notifications")
              }
            >
              Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
