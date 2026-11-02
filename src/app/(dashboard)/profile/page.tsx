import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <>
      <div className="mx-auto max-w-xl">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
            <p className="mt-1 text-sm text-text-secondary">Your account details.</p>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-2xl font-semibold text-accent">
                  {(user.name ?? user.email?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold text-text-primary">{user.name ?? "User"}</div>
                  <div className="text-sm text-text-muted">{user.email}</div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Plan platform access</span>
                <Badge variant="success">Active</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Account</CardTitle></CardHeader>
            <CardContent>
              <SignOutButton />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-sm text-text-secondary">
              <p className="mb-2">Study Plan Platform turns your courses and deadlines into realistic day-by-day plans.</p>
              <p className="text-xs text-text-muted">v0.1.0 · Next.js · Prisma · NextAuth · Tailwind · Recharts · FSRS</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
