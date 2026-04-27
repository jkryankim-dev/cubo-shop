export default function GlobalLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-brand-pink border-t-transparent" />
        불러오는 중…
      </div>
    </div>
  );
}
