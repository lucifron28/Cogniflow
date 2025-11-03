import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { NotesService } from './notes.service';
import { TaskService } from './task.service';
import { Note } from '../models/note.model';

export interface ActivityLog {
  id: string;
  type: 'note_created' | 'note_updated' | 'note_deleted' | 'task_created' | 'task_completed' | 'session_start' | 'session_end';
  timestamp: Date;
  details: string;
}

export interface StudyStats {
  totalNotes: number;
  totalTasks: number;
  completedTasks: number;
  studyTimeMinutes: number;
  activeStreak: number;
  tagsUsed: number;
  notesThisWeek: number;
  notesThisMonth: number;
}

export interface TagDistribution {
  tag: string;
  count: number;
  percentage: number;
}

export interface DailyActivity {
  date: string;
  noteCreated: number;
  noteUpdated: number;
  taskCompleted: number;
  studyMinutes: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private notesService = inject(NotesService);
  private taskService = inject(TaskService);

  private activityLogSubject = new BehaviorSubject<ActivityLog[]>([]);
  private sessionStartTime: Date | null = null;
  private studyTimeMinutes = 0;

  activityLog$ = this.activityLogSubject.asObservable();

  constructor() {
    this.loadActivityLog();
    this.startSession();
  }

  // Track user activity
  trackActivity(type: ActivityLog['type'], details: string) {
    const activity: ActivityLog = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      timestamp: new Date(),
      details
    };

    const currentLog = this.activityLogSubject.value;
    const updatedLog = [activity, ...currentLog].slice(0, 50); // Keep last 50 activities
    this.activityLogSubject.next(updatedLog);
    this.saveActivityLog(updatedLog);
  }

  // Get comprehensive study statistics
  getStudyStats(): Observable<StudyStats> {
    return combineLatest([
      this.notesService.getNotes(),
      this.taskService.getTasks()
    ]).pipe(
      map(([notes, tasks]) => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Count notes created this week/month
        const notesThisWeek = notes.filter(n => 
          n.createdAt && new Date(n.createdAt) >= oneWeekAgo
        ).length;

        const notesThisMonth = notes.filter(n => 
          n.createdAt && new Date(n.createdAt) >= oneMonthAgo
        ).length;

        // Count unique tags
        const allTags = new Set<string>();
        notes.forEach(note => {
          note.tags?.forEach(tag => allTags.add(tag));
        });

        // Count completed tasks
        const completedTasks = tasks.filter(t => t.status === 'done').length;

        // Calculate active streak
        const streak = this.calculateActiveStreak(notes);

        return {
          totalNotes: notes.length,
          totalTasks: tasks.length,
          completedTasks,
          studyTimeMinutes: this.getStudyTime(),
          activeStreak: streak,
          tagsUsed: allTags.size,
          notesThisWeek,
          notesThisMonth
        };
      })
    );
  }

  // Get tag distribution for charts
  getTagDistribution(): Observable<TagDistribution[]> {
    return this.notesService.getNotes().pipe(
      map(notes => {
        const tagCount = new Map<string, number>();
        let totalTags = 0;

        notes.forEach(note => {
          note.tags?.forEach(tag => {
            tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
            totalTags++;
          });
        });

        const distribution: TagDistribution[] = Array.from(tagCount.entries())
          .map(([tag, count]) => ({
            tag,
            count,
            percentage: totalTags > 0 ? (count / totalTags) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10 tags

        return distribution;
      })
    );
  }

  // Get daily activity for the last 30 days
  getDailyActivity(): Observable<DailyActivity[]> {
    return combineLatest([
      this.notesService.getNotes(),
      this.activityLog$
    ]).pipe(
      map(([notes, activities]) => {
        const last30Days: DailyActivity[] = [];
        const now = new Date();

        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          const dateStr = date.toISOString().split('T')[0];

          // Count activities for this day
          const dayActivities = activities.filter(a => {
            const actDate = new Date(a.timestamp);
            return actDate >= date && actDate < nextDate;
          });

          last30Days.push({
            date: dateStr,
            noteCreated: dayActivities.filter(a => a.type === 'note_created').length,
            noteUpdated: dayActivities.filter(a => a.type === 'note_updated').length,
            taskCompleted: dayActivities.filter(a => a.type === 'task_completed').length,
            studyMinutes: 0 // Can be enhanced to track actual study time per day
          });
        }

        return last30Days;
      })
    );
  }

  // Calculate active streak (consecutive days with activity)
  private calculateActiveStreak(notes: Note[]): number {
    if (notes.length === 0) return 0;

    const activityDates = new Set<string>();
    notes.forEach(note => {
      if (note.createdAt) {
        const date = new Date(note.createdAt);
        const dateStr = date.toISOString().split('T')[0];
        activityDates.add(dateStr);
      }
      if (note.updatedAt) {
        const date = new Date(note.updatedAt);
        const dateStr = date.toISOString().split('T')[0];
        activityDates.add(dateStr);
      }
    });

    const sortedDates = Array.from(activityDates).sort().reverse();
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (sortedDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Allow one day gap if we're checking today
        if (i === 0 && dateStr !== today) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    return streak;
  }

  // Session management
  startSession() {
    this.sessionStartTime = new Date();
    this.trackActivity('session_start', 'Study session started');

    // Load saved study time
    const savedTime = localStorage.getItem('cogniflow_study_time');
    if (savedTime) {
      this.studyTimeMinutes = parseInt(savedTime, 10);
    }

    // Track study time every minute
    setInterval(() => {
      if (this.sessionStartTime) {
        this.studyTimeMinutes++;
        localStorage.setItem('cogniflow_study_time', this.studyTimeMinutes.toString());
      }
    }, 60000); // Every minute
  }

  private endSession() {
    if (this.sessionStartTime) {
      const sessionDuration = Math.floor(
        (new Date().getTime() - this.sessionStartTime.getTime()) / 60000
      );
      this.trackActivity('session_end', `Session ended (${sessionDuration} minutes)`);
      this.sessionStartTime = null;
    }
  }

  getStudyTime(): number {
    return this.studyTimeMinutes;
  }

  // Persistence
  private loadActivityLog() {
    const saved = localStorage.getItem('cogniflow_activity_log');
    if (saved) {
      try {
        const activities = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const parsed = activities.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
        this.activityLogSubject.next(parsed);
      } catch (e) {
        console.error('Failed to load activity log', e);
      }
    }
  }

  private saveActivityLog(log: ActivityLog[]) {
    try {
      localStorage.setItem('cogniflow_activity_log', JSON.stringify(log));
    } catch (e) {
      console.error('Failed to save activity log', e);
    }
  }

  // Reset analytics (for testing or user preference)
  resetAnalytics() {
    localStorage.removeItem('cogniflow_activity_log');
    localStorage.removeItem('cogniflow_study_time');
    this.activityLogSubject.next([]);
    this.studyTimeMinutes = 0;
    this.trackActivity('session_start', 'Analytics reset - new session started');
  }
}
