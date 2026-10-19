import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardBody } from "@/components/ui/card";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold">Apex Insights</span>
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Free for students, research and school projects.
          </p>
        </div>

        <Card>
          <CardBody>
            <AuthForm mode="signup" />
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
