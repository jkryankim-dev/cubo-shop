import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import SearchView from "./search-view";

export const metadata: Metadata = {
  title: "검색",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Skeleton className="h-10 w-64" />
        </div>
      }
    >
      <SearchView />
    </Suspense>
  );
}
