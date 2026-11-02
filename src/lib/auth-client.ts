import { signIn } from "next-auth/react";

export type SignupParams = {
  email: string;
  name: string;
  password: string;
  callbackUrl?: string;
};

export type LoginParams = {
  email: string;
  password: string;
  callbackUrl?: string;
};

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.message as string) || "Request failed");
  return data;
}

export async function signup(params: SignupParams): Promise<void> {
  await post("/api/auth/signup", {
    email: params.email,
    name: params.name,
    password: params.password,
  });
  await signIn("credentials", {
    email: params.email,
    password: params.password,
    redirect: false,
  });
  window.location.href = params.callbackUrl ?? "/dashboard";
}

export async function login(params: LoginParams): Promise<void> {
  await signIn("credentials", {
    email: params.email,
    password: params.password,
    redirect: false,
  });
  window.location.href = params.callbackUrl ?? "/dashboard";
}
