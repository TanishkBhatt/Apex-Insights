import Link from "next/link";
import { LayoutDashboard, Plus, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
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
            <Logo href="/dashboard" heightClass="h-7 sm:h-8" />
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Settings className="h-4 w-4" aria-hidden />
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/surveys/new" aria-label="New survey">
              <Button size="sm">
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">New survey</span>
              </Button>
            </Link>
            <Link
              href="/dashboard/settings"
              title="Account settings"
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-slate-100"
            >
              <UserAvatar
                image={user.image}
                className="h-8 w-8 ring-1 ring-slate-200"
              />
              <span className="hidden text-right sm:block">
                <span className="block text-xs font-medium text-slate-700">
                  {user.name}
                </span>
                <span className="block text-xs text-slate-500">{user.email}</span>
              </span>
            </Link>
            <ThemeToggle />
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
