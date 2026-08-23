export type UserRole = 'ADMIN' | 'MEMBER';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthUser extends UserSummary {
  mustChangePassword: boolean;
}

export interface EpicMember {
  userId: string;
  name: string;
  email: string;
  addedAt: string;
}

export interface Epic {
  id: string;
  ticketId: string;
  name: string;
  createdByName: string | null;
  createdAt: string;
  taskCount: number;
}

export type StatusCategory = 'ACTIVE' | 'DONE';

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  category: StatusCategory;
  sortOrder: number;
  system: boolean;
}

export type TaskType = 'BE' | 'UI';

export interface LinkedTaskSummary {
  id: string;
  ticketId: string;
  type: TaskType;
}

export interface Task {
  id: string;
  epicId: string;
  ticketId: string;
  title: string;
  description: string | null;
  type: TaskType;
  note: string | null;
  beAssignee: UserSummary | null;
  uiAssignee: UserSummary | null;
  testAssignee: UserSummary | null;
  devEffort: number;
  testEffort: number;
  totalEffort: number;
  linkedTasks: LinkedTaskSummary[];
  status: TaskStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWriteInput {
  ticketId: string;
  title: string;
  description: string | null;
  type: TaskType;
  note: string | null;
  beAssigneeId: string | null;
  uiAssigneeId: string | null;
  testAssigneeId: string | null;
  devEffort: number;
  testEffort: number;
  statusId: string;
}

export interface EpicNote {
  id: string;
  content: string;
  author: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface EpicDocument {
  id: string;
  displayName: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface EpicTodo {
  id: string;
  title: string;
  assignee: UserSummary | null;
  dueDate: string | null;
  done: boolean;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface BeTicketRequestTaskSummary {
  id: string;
  ticketId: string;
  title: string;
}

export interface BeTicketRequest {
  id: string;
  uiTask: BeTicketRequestTaskSummary;
  note: string;
  apiDesign: string | null;
  resolved: boolean;
  createdBy: UserSummary;
  createdAt: string;
  resolvedAt: string | null;
}

export interface EpicMeeting {
  id: string;
  title: string;
  scheduledAt: string;
  link: string | null;
  agenda: string | null;
  minutes: string | null;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineConfig {
  userId: string;
  startDate: string; // yyyy-MM-dd
  gapDays: string[];
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; reason: string }[];
  warnings: { row: number; reason: string }[];
}
