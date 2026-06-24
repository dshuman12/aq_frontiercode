import type React from "react";
import { CreatorSidebar } from "@/components/creator-sidebar";

export default function CreatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <main className="h-full w-full overflow-y-auto">{children}</main>;
}
