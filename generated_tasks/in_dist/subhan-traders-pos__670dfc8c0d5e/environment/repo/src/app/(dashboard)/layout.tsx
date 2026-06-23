import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OfflineProvider>
      <div className="h-screen flex overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 md:start-0 z-50 border-e border-border/50">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1 md:ps-64 lg:ps-72 flex flex-col min-h-screen">
          <Suspense>
            <Navbar />
          </Suspense>
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OfflineProvider>
  );
}

