"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";

const HIDE_ON = [/^\/sign-in/, /^\/sign-up/, /^\/magic-link/];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = HIDE_ON.some((re) => re.test(pathname));
  if (hide) return <>{children}</>;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </>
  );
}
