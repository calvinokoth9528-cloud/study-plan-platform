"use client";

import { useState, FormEvent } from "react";
import { Button, Input, Card, CardContent, FieldGroup } from "@/components/ui";
import { login } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password, callbackUrl: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
            <p className="mt-1 text-sm text-text-secondary">Sign in to continue planning.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-danger bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </FieldGroup>
            <FieldGroup label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" required />
            </FieldGroup>
            <Button type="submit" isLoading={loading} className="w-full">Sign in</Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="font-medium text-accent underline-offset-2 hover:underline">Create one</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
