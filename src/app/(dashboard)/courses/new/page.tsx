import { requireAuth } from "@/lib/auth";
import { CourseForm } from "./course-form";

export default async function NewCoursePage() {
  await requireAuth();

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">New course</h1>
          <p className="mt-1 text-sm text-text-secondary">Courses group topics and feed plan generation.</p>
        </div>
        <CourseForm />
      </div>
    </>
  );
}
