import Link from "next/link";
import { LecturnMark } from "~/components/lecturn-mark";
import { ThemeToggle } from "~/components/theme-toggle";
import { UserMenu } from "~/features/auth/UserMenu";
import { SyncButton } from "~/features/courses/components/SyncButton";
import { LibrarySwitcher } from "~/features/libraries/LibrarySwitcher";
import { SearchTrigger } from "~/features/search/SearchTrigger";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-(--background)/80 border-b border-(--border)">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LecturnMark className="size-6" />
          <span className="font-display text-xl font-semibold tracking-tight">Lecturn</span>
        </Link>
        <div className="flex items-center gap-2">
          <SearchTrigger />
          <LibrarySwitcher />
          <SyncButton />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
