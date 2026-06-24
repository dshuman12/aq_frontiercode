"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/agency-sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AgencyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        queueMicrotask(() => setSidebarOpen(false));
    }, [pathname]);

    return (
        <div className="flex h-screen w-full min-w-0">
            {/* Desktop sidebar */}
            <div className="hidden md:block sticky left-0 top-0 h-screen shrink-0">
                <AppSidebar />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-white border-b border-gray-200 shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target shrink-0"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <span className="font-semibold text-gray-900 ml-2">Repflow</span>
            </div>

            {/* Mobile sidebar drawer */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="w-[min(280px,85vw)] p-0">
                    <AppSidebar onNavigate={() => setSidebarOpen(false)} />
                </SheetContent>
            </Sheet>

            {/* Main content - responsive padding and top offset for mobile header */}
            <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-w-0 pt-14 md:pt-0 agency-scrollbar">
                {children}
            </main>
        </div>
    );
}
