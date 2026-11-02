import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PlanHeader } from "./plan-header";
import { WeekView } from "./week-view";
import { RoadmapView } from "./roadmap-view";
import { RepairSection } from "./repair-section";
import { VersionsSection } from "./versions-section";
import { NotesSection } from "./notes/section";
import { DocumentsSection, type DocMeta } from "./documents/section";
import { StudyTimer } from "./study-timer";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const plan = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
      versions: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { tasks: true } },
    },
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

  const course = plan.course;
  const tasks = plan.tasks.map((t) => ({
    id: t.id,
    topicId: t.topicId,
    scheduledDate: t.scheduledDate.toISOString(),
    scheduledHours: t.scheduledHours,
    isReview: t.isReview,
    reviewDueDate: t.reviewDueDate?.toISOString(),
    status: t.status,
    actualHours: t.actualHours ?? undefined,
    confidence: t.confidence ?? undefined,
    locked: t.locked,
    sortOrder: t.sortOrder,
  }));

  const totalHours = tasks.reduce((s, t) => s + t.scheduledHours, 0);
  const doneHours = tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const completionPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  let unavailableDays: string[] = [];
  try {
    unavailableDays = JSON.parse(plan.unavailableDays) as string[];
  } catch {
    unavailableDays = [];
  }

  const topicTitles = new Map<string, string>();
  const topics = await prisma.topic.findMany({
    where: { courseId: plan.courseId },
    select: { id: true, title: true },
  });
  topics.forEach((t) => topicTitles.set(t.id, t.title));

  const [documents, docsTopics] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id, courseId: plan.courseId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, mimeType: true, size: true, topicId: true, url: true, createdAt: true },
    }),
    prisma.topic.findMany({
      where: { courseId: plan.courseId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  const docMetas: DocMeta[] = documents.map((d) => ({
    id: d.id,
    name: d.name,
    mimeType: d.mimeType,
    size: d.size,
    topicId: d.topicId,
    topicTitle: d.topicId ? (topicTitles.get(d.topicId) ?? null) : null,
    createdAt: d.createdAt.toISOString(),
    link: d.url ?? `/api/documents/${d.id}`,
  }));

  const timerTasks = plan.tasks
    .filter((t) => t.status !== "done")
    .map((t) => ({
      id: t.id,
      topicTitle: topicTitles.get(t.topicId) ?? "Task",
      scheduledDate: t.scheduledDate.toISOString(),
      status: t.status,
    }));

  return (
    <>
      <div className="flex flex-col gap-6">
        <PlanHeader
          planId={plan.id}
          planName={plan.name}
          planStatus={plan.status}
          generatedAt={plan.generatedAt.toISOString()}
          taskCount={plan._count.tasks}
          courseName={course.name}
          courseColor={course.color}
          completionPct={completionPct}
          totalHours={totalHours}
          doneHours={doneHours}
          doneCount={doneCount}
        />

        <Card>
          <CardHeader><CardTitle>Week view</CardTitle></CardHeader>
          <CardContent>
            <WeekView tasks={tasks} courseColor={course.color} unavailableDays={unavailableDays} />
          </CardContent>
        </Card>

        <RoadmapView tasks={tasks} topicTitles={Object.fromEntries(topicTitles)} courseColor={course.color} />

        <NotesSection planId={plan.id} />

        <RepairSection planId={plan.id} />

        <VersionsSection planId={plan.id} versions={plan.versions.map((v) => ({ id: v.id, label: v.label, createdAt: v.createdAt.toISOString() }))} />

        <DocumentsSection courseId={plan.courseId} topics={docsTopics} documents={docMetas} />
      </div>

      <StudyTimer tasks={timerTasks} />
    </>
  );
}
