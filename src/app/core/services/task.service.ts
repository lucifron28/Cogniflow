import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  CollectionReference,
  DocumentData,
  Unsubscribe,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { Task, TaskStatus, Priority } from '../models/task.model';

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: Priority[];
  tags?: string[];
  linkedNoteId?: string;
  searchQuery?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private envInjector = inject(EnvironmentInjector);
  private tasksCollectionRef: CollectionReference<DocumentData>;

  // Real-time listener state
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private tasksListener: Unsubscribe | null = null;

  constructor() {
    this.tasksCollectionRef = collection(this.firestore, 'tasks');
    
    // Start listening when user is authenticated
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.startTasksListener();
      } else {
        this.tasksListener?.();
        this.tasksListener = null;
        this.tasksSubject.next([]);
      }
    });
  }

  private get tasksCollection(): CollectionReference<DocumentData> {
    return this.tasksCollectionRef;
  }

  private getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  private convertTimestamps(data: any): Task {
    return {
      ...data,
      dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : data.dueDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
    } as Task;
  }

  private startTasksListener(): void {
    if (this.tasksListener) return;
    
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.tasksSubject.next([]);
      return;
    }

    const q = query(
      this.tasksCollection, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    runInInjectionContext(this.envInjector, () => {
      this.tasksListener = onSnapshot(
        q,
        (snapshot) => {
          const tasks = snapshot.docs.map(d => this.convertTimestamps({ id: d.id, ...d.data() }));
          this.tasksSubject.next(tasks);
          console.log('Tasks updated:', tasks.length, 'tasks loaded');
        },
        (error) => {
          console.error('Error in tasks listener:', error);
          this.tasksSubject.next([]);
        }
      );
    });
  }

  // Create
  async createTask(taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to create tasks');

    const now = Timestamp.now();
    const task = {
      ...taskData,
      userId,
      createdAt: now,
      updatedAt: now,
      dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
      completedAt: taskData.completedAt ? Timestamp.fromDate(taskData.completedAt) : null,
    };

    const docRef = await runInInjectionContext(this.envInjector, () => 
      addDoc(this.tasksCollection, task)
    );
    return docRef.id;
  }

  // Read (Observable) - real-time with filtering
  getTasks(filter?: TaskFilter): Observable<Task[]> {
    return this.tasksSubject.asObservable().pipe(
      map((tasks) => {
        let filtered = tasks;

        // Apply filters
        if (filter?.status && filter.status.length > 0) {
          filtered = filtered.filter(t => filter.status!.includes(t.status));
        }
        if (filter?.priority && filter.priority.length > 0) {
          filtered = filtered.filter(t => filter.priority!.includes(t.priority));
        }
        if (filter?.tags && filter.tags.length > 0) {
          filtered = filtered.filter(t => 
            filter.tags!.some(tag => t.tags.includes(tag))
          );
        }
        if (filter?.linkedNoteId !== undefined) {
          filtered = filtered.filter(t => t.linkedNoteId === filter.linkedNoteId);
        }
        if (filter?.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            t.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }

        return filtered;
      })
    );
  }

  // Get single task
  async getTask(taskId: string): Promise<Task | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    const taskDocRef = doc(this.firestore, `tasks/${taskId}`);
    const snap = await runInInjectionContext(this.envInjector, () => getDoc(taskDocRef));
    
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data['userId'] !== userId) return null;
    
    return this.convertTimestamps({ id: snap.id, ...data });
  }

  // Update
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to update tasks');

    const taskDocRef = doc(this.firestore, `tasks/${taskId}`);
    const snap = await runInInjectionContext(this.envInjector, () => getDoc(taskDocRef));
    
    if (!snap.exists() || snap.data()['userId'] !== userId) {
      throw new Error('Task not found or access denied');
    }

    const updateData: any = { 
      ...updates, 
      updatedAt: Timestamp.now(),
    };
    
    // Convert dates to Timestamps
    if (updateData.dueDate instanceof Date) {
      updateData.dueDate = Timestamp.fromDate(updateData.dueDate);
    }
    if (updateData.completedAt instanceof Date) {
      updateData.completedAt = Timestamp.fromDate(updateData.completedAt);
    }
    
    // Remove fields that shouldn't be updated
    delete updateData['id'];
    delete updateData['userId'];
    delete updateData['createdAt'];

    await runInInjectionContext(this.envInjector, () => 
      updateDoc(taskDocRef, updateData)
    );
  }

  // Delete
  async deleteTask(taskId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to delete tasks');

    const taskDocRef = doc(this.firestore, `tasks/${taskId}`);
    const snap = await runInInjectionContext(this.envInjector, () => getDoc(taskDocRef));
    
    if (!snap.exists() || snap.data()['userId'] !== userId) {
      throw new Error('Task not found or access denied');
    }

    await runInInjectionContext(this.envInjector, () => deleteDoc(taskDocRef));
  }

  // Update task status
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const updates: Partial<Task> = { 
      status,
      completedAt: status === 'done' ? new Date() : null,
    };
    await this.updateTask(taskId, updates);
  }

  // Update task priority
  async updateTaskPriority(taskId: string, priority: Priority): Promise<void> {
    await this.updateTask(taskId, { priority });
  }

  // Get all unique tags
  async getAllTags(): Promise<string[]> {
    const tasks = this.tasksSubject.value;
    const tagSet = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }

  ngOnDestroy() {
    this.tasksListener?.();
  }
}
