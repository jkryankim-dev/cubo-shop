"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { ShopErrorLog } from "@/types";

type SourceFilter = "all" | "server" | "client" | "global";

const SOURCE_BADGE: Record<ShopErrorLog["source"], string> = {
  server: "bg-brand-pink/15 text-brand-pink",
  client: "bg-brand-mint/30 text-foreground",
  global: "bg-destructive/15 text-destructive",
};

const SOURCE_LABEL: Record<ShopErrorLog["source"], string> = {
  server: "서버",
  client: "클라이언트",
  global: "글로벌",
};

const PAGE_SIZE = 200;

export default function AdminErrorLogsPage() {
  const [logs, setLogs] = useState<ShopErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<SourceFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const q = query(
        collection(db, "shop_error_logs"),
        orderBy("timestamp", "desc"),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      const next = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ShopErrorLog,
      );
      setLogs(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let arr = logs;
    if (source !== "all") arr = arr.filter((l) => l.source === source);
    if (keyword) {
      const q = keyword.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.message?.toLowerCase().includes(q) ||
          l.context?.toLowerCase().includes(q) ||
          l.url?.toLowerCase().includes(q) ||
          l.userUid?.toLowerCase().includes(q) ||
          l.stack?.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [logs, source, keyword]);

  const counts = useMemo(() => {
    const c = { all: logs.length, server: 0, client: 0, global: 0 };
    for (const l of logs) c[l.source] += 1;
    return c;
  }, [logs]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <AlertOctagon className="size-5" />
          오류 로그
        </h1>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn("mr-1 size-4", loading && "animate-spin")} />
          새로고침
        </Button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        쿠보몰 전체 오류 (서버 / 클라이언트 / 글로벌) 최신 {PAGE_SIZE}건. 행을
        클릭하면 stack trace 가 펼쳐집니다.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { value: "all", label: `전체 (${counts.all})` },
            { value: "server", label: `서버 (${counts.server})` },
            { value: "client", label: `클라이언트 (${counts.client})` },
            { value: "global", label: `글로벌 (${counts.global})` },
          ] as { value: SourceFilter; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSource(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              source === opt.value
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:bg-accent/40",
            )}
          >
            {opt.label}
          </button>
        ))}
        <Input
          type="search"
          placeholder="메시지/컨텍스트/URL/UID 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="ml-auto max-w-xs"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              조건에 맞는 오류 로그가 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((log) => {
                const isOpen = expanded.has(log.id);
                const time = log.timestamp
                  ? new Date(log.timestamp.toMillis()).toLocaleString("ko-KR")
                  : "—";
                return (
                  <li key={log.id} className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="flex w-full flex-wrap items-start gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          SOURCE_BADGE[log.source],
                        )}
                      >
                        {SOURCE_LABEL[log.source]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium">
                          {log.message || "(no message)"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {time}
                          {log.context ? ` · ${log.context}` : ""}
                          {log.userUid
                            ? ` · uid=${log.userUid.slice(0, 8)}…`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {isOpen ? "접기" : "펼치기"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-2 rounded-md bg-muted/40 p-3 text-xs">
                        {log.url && (
                          <Field label="URL">
                            <code className="break-all">{log.url}</code>
                          </Field>
                        )}
                        {log.userAgent && (
                          <Field label="UA">
                            <span className="break-all">{log.userAgent}</span>
                          </Field>
                        )}
                        {log.userUid && (
                          <Field label="UID">
                            <code>{log.userUid}</code>
                          </Field>
                        )}
                        {log.digest && (
                          <Field label="Digest">
                            <code>{log.digest}</code>
                          </Field>
                        )}
                        {log.stack && (
                          <Field label="Stack">
                            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                              {log.stack}
                            </pre>
                          </Field>
                        )}
                        {log.extra && (
                          <Field label="Extra">
                            <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
                              {JSON.stringify(log.extra, null, 2)}
                            </pre>
                          </Field>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="w-14 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 min-w-0">{children}</span>
    </div>
  );
}
