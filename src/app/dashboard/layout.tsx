import Link from "next/link";
import { BarChart3, LayoutDashboard, Plus } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <BarChart3 className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-semibold">Apex Insights</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/surveys/new">
              <Button size="sm">
                <Plus className="h-4 w-4" aria-hidden />
                New survey
              </Button>
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-700">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">
          Apex Insights — Survey Made Easy
        </div>
      </footer>
    </div>
  );
}
