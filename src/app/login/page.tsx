import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardBody } from "@/components/ui/card";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo heightClass="h-10" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage your surveys.</p>
        </div>

        <Card>
          <CardBody>
            <AuthForm mode="signin" />
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
