import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import Link from "next/link";
import { CourseActions } from "./course-actions";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const user = await requireAuth();

  const courses = await prisma.course.findMany({
    where: { userId: user.id },
    include: {
      topics: { select: { id: true, estimatedHours: true } },
      _count: { select: { topics: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalEstimated = courses.reduce((s, c) => s + c.topics.reduce((t, tp) => t + tp.estimatedHours, 0), 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Courses</h1>
            <p className="mt-1 text-sm text-text-secondary">Courses hold your topics and drive plan generation.</p>
          </div>
          <CourseActions />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-6 p-6">
            {courses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-text-muted">No courses yet. Create your first course to start planning.</p>
                <Link href="/courses/new" className="mt-3 inline-block"><Button>Create course</Button></Link>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {courses.map((c) => (
                    <Link key={c.id} href={"/courses/" + c.id}>
                      <Card className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:border-accent/50">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-text-primary">{c.name}</div>
                            <div className="text-xs text-text-muted">
                              {c._count.topics} topic{c._count.topics === 1 ? "" : "s"} ·{" "}
                              {c.topics.reduce((t, tp) => t + tp.estimatedHours, 0).toFixed(1)}h est.
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.examDate && (
                            <Badge variant="warning">
                              Exam {new Date(c.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </Badge>
                          )}
                          <svg className="h-4 w-4 text-text-muted transition-colors group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
                <Link href="/courses/new" className="w-fit"><Button variant="secondary">+ New course</Button></Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Courses</span>
              <span className="font-medium text-text-primary">{courses.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Topics</span>
              <span className="font-medium text-text-primary">{courses.reduce((s, c) => s + c._count.topics, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Estimated hours</span>
              <span className="font-medium text-text-primary">{totalEstimated.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
