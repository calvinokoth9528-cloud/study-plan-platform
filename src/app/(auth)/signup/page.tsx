"use client";

import { useState, FormEvent } from "react";
import { Button, Input, Card, CardContent, FieldGroup } from "@/components/ui";
import { signup } from "@/lib/auth-client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup({ email, name, password, callbackUrl: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
            <p className="mt-1 text-sm text-text-secondary">Start planning your studies in minutes.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-danger bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup label="Name" hint="Your display name (optional)">
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Calvin" autoComplete="name" />
            </FieldGroup>
            <FieldGroup label="Email" hint="We will never share your email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </FieldGroup>
            <FieldGroup label="Password" hint="At least 8 characters">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" autoComplete="new-password" minLength={8} required />
            </FieldGroup>
            <Button type="submit" isLoading={loading} className="w-full">Create account</Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-accent underline-offset-2 hover:underline">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
