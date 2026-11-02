export interface TopicInput {
  id: string;
  title: string;
  estimatedHours: number;
  examDate?: string;
  notes?: string;
  order: number;
}

export interface CourseInput {
  id: string;
  name: string;
  color: string;
  examDate?: string;
  topics: TopicInput[];
}

export interface CapacityInput {
  weeklyCapacityHours: number;
  unavailableDays: string[];
}

export interface DaySlot {
  date: string;
  availableHours: number;
  load: number;
}

export interface PlanTaskOutput {
  id: string;
  topicId: string;
  scheduledDate: string;
  scheduledHours: number;
  isReview: boolean;
  reviewDueDate?: string;
  status: "pending" | "in_progress" | "done" | "partial";
  locked: boolean;
  sortOrder: number;
}

export interface PlanMetrics {
  totalTopicHours: number;
  totalReviewHours: number;
  totalWeeksEstimated: number;
  daysUsed: number;
  overloadDays: string[];
}

export interface ExistingTaskSnapshot {
  id: string;
  topicId: string;
  scheduledDate: string;
  scheduledHours: number;
  isReview: boolean;
  reviewDueDate?: string;
  status: string;
  actualHours?: number;
  confidence?: number;
  locked: boolean;
}

export interface RepairContext {
  courseId: string;
  courseName: string;
  color: string;
  tasks: ExistingTaskSnapshot[];
  completedTopicIds: string[];
  partialTopicIds: string[];
  topicActualHours: Record<string, number>;
  topicConfidence: Record<string, number>;
  weeklyCapacityHours: number;
  unavailableDays: string[];
  startFrom: string;
  examDate?: string;
  horizonDays: number;
  nextReviewDates: Record<string, string | null>;
}

export interface RepairProposal {
  label: string;
  description: string;
  tasks: PlanTaskOutput[];
  diff: PlanDiff;
  metrics: PlanMetrics;
}

export interface PlanDiff {
  movedTasks: { id: string; topicId: string; from: string; to: string; hours: number }[];
  addedTasks: { id: string; topicId: string; date: string; hours: number; isReview: boolean }[];
  removedTasks: { id: string; topicId: string; date: string }[];
  protectedTasks: { id: string; topicId: string; date: string }[];
  conflictNotes: string[];
}

export interface GeneratedPlan {
  courseId: string;
  courseName: string;
  color: string;
  startFrom: string;
  weeks: DaySlot[];
  tasks: PlanTaskOutput[];
  metrics: PlanMetrics;
}
