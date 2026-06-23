import { SupplierDetailClient } from "@/components/inventory/SupplierDetailClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Suspense fallback={<SupplierDetailSkeleton />}>
        <SupplierDetailClient supplierId={id} />
      </Suspense>
    </div>
  );
}

function SupplierDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
