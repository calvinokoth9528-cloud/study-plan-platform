import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui";
import Link from "next/link";
import { PlanEditForm } from "./plan-edit-form";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const plan = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    include: { course: { select: { id: true, name: true } } },
  });
  if (!plan) {
    return (
      <>
        <div className="py-16 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Plan not found</h1>
        </div>
      </>
    );
  }

  let unavailable: string[] = [];
  try {
    unavailable = JSON.parse(plan.unavailableDays) as string[];
  } catch {
    unavailable = [];
  }

  const WEEKDAY_OPTIONS = [
    { value: "Sun", label: "Sun" },
    { value: "Mon", label: "Mon" },
    { value: "Tue", label: "Tue" },
    { value: "Wed", label: "Wed" },
    { value: "Thu", label: "Thu" },
    { value: "Fri", label: "Fri" },
    { value: "Sat", label: "Sat" },
  ];

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit plan</h1>
            <p className="mt-1 text-sm text-text-secondary">{plan.course.name}</p>
          </div>
          <Link href={"/plans/" + plan.id}><Button variant="secondary">Back to plan</Button></Link>
        </div>

        <PlanEditForm
          planId={plan.id}
          planName={plan.name}
          weeklyCapacity={plan.weeklyCapacityHours as unknown as number}
          initialUnavailable={unavailable}
          weekdays={WEEKDAY_OPTIONS}
        />
      </div>
    </>
  );
}
