import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskService, TaskFilter } from '../../services/task.service';
import { NotesService } from '../../services/notes.service';
import { Task, TaskStatus, Priority } from '../../core/models/task.model';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent {
  taskService = inject(TaskService);
  notesService = inject(NotesService);
  themeService = inject(ThemeService);
  router = inject(Router);

  tasks = signal<Task[]>([]);
  notes = signal<{ id: string; title: string }[]>([]);
  
  selectedStatuses = signal<TaskStatus[]>([]);
  selectedPriorities = signal<Priority[]>([]);
  selectedTags = signal<string[]>([]);
  searchQuery = signal('');
  
  showCreateModal = signal(false);
  editingTask = signal<Task | null>(null);
  
  newTask = signal({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    status: 'todo' as TaskStatus,
    dueDate: null as Date | null,
    tags: [] as string[],
    linkedNoteId: null as string | null,
  });

  tagInput = signal('');
  
  allStatuses: TaskStatus[] = ['todo', 'in-progress', 'done', 'cancelled'];
  allPriorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  availableTags = signal<string[]>([]);

  filteredTasks = computed(() => {
    const filter: TaskFilter = {
      status: this.selectedStatuses().length > 0 ? this.selectedStatuses() : undefined,
      priority: this.selectedPriorities().length > 0 ? this.selectedPriorities() : undefined,
      tags: this.selectedTags().length > 0 ? this.selectedTags() : undefined,
      searchQuery: this.searchQuery() || undefined,
    };
    
    return this.tasks();
  });

  constructor() {
    this.loadTasks();
    
    this.notesService.getNotes().subscribe(notes => {
      this.notes.set(notes.map(n => ({ id: n.id!, title: n.title })));
    });
    
    this.loadTags();
  }

  loadTasks() {
    const filter: TaskFilter = {
      status: this.selectedStatuses().length > 0 ? this.selectedStatuses() : undefined,
      priority: this.selectedPriorities().length > 0 ? this.selectedPriorities() : undefined,
      tags: this.selectedTags().length > 0 ? this.selectedTags() : undefined,
      searchQuery: this.searchQuery() || undefined,
    };
    
    this.taskService.getTasks(filter).subscribe(tasks => {
      this.tasks.set(tasks);
    });
  }

  async loadTags() {
    const tags = await this.taskService.getAllTags();
    this.availableTags.set(tags);
  }

  toggleStatus(status: TaskStatus) {
    const current = this.selectedStatuses();
    if (current.includes(status)) {
      this.selectedStatuses.set(current.filter(s => s !== status));
    } else {
      this.selectedStatuses.set([...current, status]);
    }
    this.loadTasks();
  }

  togglePriority(priority: Priority) {
    const current = this.selectedPriorities();
    if (current.includes(priority)) {
      this.selectedPriorities.set(current.filter(p => p !== priority));
    } else {
      this.selectedPriorities.set([...current, priority]);
    }
    this.loadTasks();
  }

  toggleTag(tag: string) {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
    this.loadTasks();
  }

  clearFilters() {
    this.selectedStatuses.set([]);
    this.selectedPriorities.set([]);
    this.selectedTags.set([]);
    this.searchQuery.set('');
    this.loadTasks();
  }

  openCreateModal() {
    this.newTask.set({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      dueDate: null,
      tags: [],
      linkedNoteId: null,
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.editingTask.set(null);
  }

  async createTask() {
    const task = this.newTask();
    if (!task.title.trim()) return;

    try {
      await this.taskService.createTask({
        ...task,
        completedAt: null,
      });
      this.closeCreateModal();
      this.loadTags();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  editTask(task: Task) {
    this.editingTask.set(task);
    this.newTask.set({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      tags: [...task.tags],
      linkedNoteId: task.linkedNoteId,
    });
    this.showCreateModal.set(true);
  }

  async saveTask() {
    const editing = this.editingTask();
    if (!editing) return;

    try {
      await this.taskService.updateTask(editing.id, this.newTask());
      this.closeCreateModal();
      this.loadTags();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  async deleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await this.taskService.deleteTask(taskId);
      this.loadTags();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  async updateTaskStatus(task: Task, status: TaskStatus) {
    try {
      await this.taskService.updateTaskStatus(task.id, status);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }

  async updateTaskPriority(task: Task, priority: Priority) {
    try {
      await this.taskService.updateTaskPriority(task.id, priority);
    } catch (error) {
      console.error('Error updating task priority:', error);
    }
  }

  addTag() {
    const tag = this.tagInput().trim();
    if (!tag) return;
    
    const current = this.newTask();
    if (!current.tags.includes(tag)) {
      this.newTask.update(t => ({
        ...t,
        tags: [...t.tags, tag]
      }));
    }
    this.tagInput.set('');
  }

  removeTag(tag: string) {
    this.newTask.update(t => ({
      ...t,
      tags: t.tags.filter(t => t !== tag)
    }));
  }

  goToNote(noteId: string | null) {
    if (noteId) {
      this.router.navigate(['/notes', noteId]);
    }
  }

  getPriorityColor(priority: Priority): string {
    const colors = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
    };
    return colors[priority];
  }

  getStatusIcon(status: TaskStatus): string {
    const icons = {
      'todo': 'circle',
      'in-progress': 'clock',
      'done': 'check-circle',
      'cancelled': 'x-circle',
    };
    return icons[status];
  }

  formatDate(date: Date | null): string {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString();
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'done' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < new Date();
  }

  getNoteName(noteId: string | null): string {
    if (!noteId) return 'No linked note';
    const note = this.notes().find(n => n.id === noteId);
    return note?.title || 'Unknown note';
  }

  onDueDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.newTask.update(t => ({
      ...t,
      dueDate: value ? new Date(value) : null
    }));
  }

  get tagInputValue() {
    return this.tagInput();
  }

  set tagInputValue(value: string) {
    this.tagInput.set(value);
  }

  get linkedNoteIdValue() {
    return this.newTask().linkedNoteId;
  }

  set linkedNoteIdValue(value: string | null) {
    this.newTask.update(t => ({ ...t, linkedNoteId: value }));
  }
}
