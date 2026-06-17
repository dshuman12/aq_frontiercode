"use client";

import { FolderTree, KeyRound, Network, User } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Card, CardBody, CardMeta, CardTitle } from "~/components/ui/card";
import { useSession } from "~/lib/auth-client";

const SECTIONS: { href: Route; title: string; blurb: string; icon: typeof User }[] = [
  {
    href: "/settings/account",
    title: "Account",
    blurb: "Update your name, email, and password.",
    icon: User,
  },
  {
    href: "/settings/sessions",
    title: "Sessions",
    blurb: "See where you're signed in and revoke other devices.",
    icon: KeyRound,
  },
  {
    href: "/settings/libraries",
    title: "Libraries",
    blurb: "Create libraries and share them with collaborators.",
    icon: FolderTree,
  },
  {
    href: "/settings/connection",
    title: "Connection",
    blurb: "API endpoint and reachability status.",
    icon: Network,
  },
];

export default function SettingsOverviewPage() {
  const { data } = useSession();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-(--muted-foreground)">
          Signed in as <span className="font-medium">{data?.user?.email ?? "…"}</span>
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map(({ href, title, blurb, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition-colors hover:bg-(--muted)/40">
              <CardBody className="flex items-start gap-3">
                <div className="grid size-9 place-items-center rounded-md bg-(--muted)">
                  <Icon className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardMeta>{blurb}</CardMeta>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
