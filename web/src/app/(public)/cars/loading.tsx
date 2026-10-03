import { Skeleton } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-5 w-72" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[19rem_1fr] lg:gap-8">
        <Skeleton className="hidden h-[34rem] lg:block" />
        <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
