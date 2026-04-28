import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import SuccessClient from "./success-client";

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              결제 확인 중…
            </CardContent>
          </Card>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
