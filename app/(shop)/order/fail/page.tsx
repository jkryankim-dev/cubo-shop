import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import FailClient from "./fail-client";

export default function OrderFailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              불러오는 중…
            </CardContent>
          </Card>
        </div>
      }
    >
      <FailClient />
    </Suspense>
  );
}
