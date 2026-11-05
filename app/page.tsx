import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";
import PageSkeleton from "@/components/PageSkeleton";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
