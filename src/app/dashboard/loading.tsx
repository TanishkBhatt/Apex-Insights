export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-slate-200" />
          <div className="h-4 w-72 rounded bg-slate-100" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-200 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-8 w-16 rounded bg-slate-200" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100" />
            </div>
            <div className="mt-5 h-8 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-sm">
        <div className="h-5 w-64 rounded bg-slate-200" />
        <div className="mt-1 h-4 w-48 rounded bg-slate-100" />
        <div className="mt-5 h-52 rounded-lg bg-slate-100" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="h-10 flex-1 rounded-lg bg-slate-100" />
          <div className="h-10 w-56 rounded-lg bg-slate-100" />
          <div className="h-10 w-40 rounded-lg bg-slate-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-40 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm"
            >
              <div className="h-5 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
              <div className="mt-10 h-8 w-2/3 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
