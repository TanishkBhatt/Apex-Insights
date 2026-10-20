import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { PasswordForm } from "@/components/settings/password-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile and account preferences.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Profile"
          description="Choose an avatar and update the username shown across your dashboard."
        />
        <CardBody>
          <ProfileForm
            user={{ name: user.name, email: user.email, image: user.image }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Password"
          description="Change the password used to sign in to your account."
        />
        <CardBody>
          <PasswordForm />
        </CardBody>
      </Card>

      <Card className="border-red-300!">
        <CardHeader
          title="Danger zone"
          description="Permanently delete your account and every survey, response, demo dataset and export that belongs to it."
        />
        <CardBody>
          <DeleteAccountForm email={user.email} />
        </CardBody>
      </Card>
    </div>
  );
}
