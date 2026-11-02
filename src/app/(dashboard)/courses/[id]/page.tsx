import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, Button } from "@/components/ui";
import Link from "next/link";
import { TopicSection } from "./topic-section";
import { GenerateSection } from "./generate-section";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const course = await prisma.course.findFirst({
    where: { id, userId: user.id },
    include: {
      topics: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, estimatedHours: true, sortOrder: true, notes: true } },
      plans: { where: { status: "active" }, include: { _count: { select: { tasks: true } } } },
    },
  });

  if (!course) {
    return (
      <>
        <div className="py-16 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Course not found</h1>
          <Link href="/courses" className="mt-3 inline-block"><Button variant="secondary">Back to courses</Button></Link>
        </div>
      </>
    );
  }

  const totalEstimated = course.topics.reduce((s, t) => s + t.estimatedHours, 0);
  const activePlan = course.plans[0] ?? null;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: course.color }} />
              <h1 className="text-2xl font-bold text-text-primary">{course.name}</h1>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {course.topics.length} topic{course.topics.length === 1 ? "" : "s"} · {totalEstimated.toFixed(1)}h estimated
              {course.examDate ? " · Exam " + new Date(course.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
            </p>
          </div>
        </div>

        {activePlan && (
          <Card className="border-l-4 border-l-accent">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-text-primary">Active plan ready</div>
                  <div className="text-xs text-text-muted">{activePlan._count.tasks} tasks scheduled</div>
                </div>
              </div>
              <Link href={"/plans/" + activePlan.id}><Button size="sm">Open plan</Button></Link>
            </CardContent>
          </Card>
        )}

        <TopicSection courseId={course.id} topics={course.topics} />

        <GenerateSection
          courseId={course.id}
          courseName={course.name}
          hasTopics={course.topics.length > 0}
          activePlan={activePlan ? { id: activePlan.id, _count: activePlan._count } : null}
        />
      </div>
    </>
  );
}
