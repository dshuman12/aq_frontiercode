"use client";

import React from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { MobileSidebar } from "@/components/layout/Sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { ModeToggle } from "@/components/mode-toggle";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage
} from "@/components/ui/breadcrumb";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations("common");

  // Generate breadcrumbs from pathname with translations
  // Only translate known route names that exist in common translations
  const knownRoutes = [
    "dashboard",
    "pos",
    "customers",
    "settings",
    "orders",
    "reports",
  ] as const;

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => {
    // Only translate if it's a known route key
    let label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (knownRoutes.includes(segment as any)) {
      label = t(segment as string);
    } else {
      // For unknown segments, format nicely (capitalize, replace dashes)
      label =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    }

    return {
      label,
      href: "/" + segments.slice(0, index + 1).join("/"),
      isLast: index === segments.length - 1,
    };
  });

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-4">
        <MobileSidebar />

        {/* Breadcrumbs */}
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                {index > 0}
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage className="font-medium">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <></>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <OfflineIndicator />
        <LanguageToggle />
        <ModeToggle />
        <UserNav />
      </div>
    </header>
  );
}
