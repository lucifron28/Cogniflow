export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
  tags: string[];
  linkedNoteId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}
