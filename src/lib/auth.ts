import { auth } from "@/lib/nextauth-config";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { id: true, email: true, name: true },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
