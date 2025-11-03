import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AnalyticsService, StudyStats, ActivityLog, DailyActivity } from '../../core/services/analytics.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private subscription = new Subscription();

  stats: StudyStats = {
    totalNotes: 0,
    totalTasks: 0,
    completedTasks: 0,
    studyTimeMinutes: 0,
    activeStreak: 0,
    tagsUsed: 0,
    notesThisWeek: 0,
    notesThisMonth: 0
  };

  recentActivities: ActivityLog[] = [];
  dailyActivity: DailyActivity[] = [];

  ngOnInit() {
    this.subscription.add(
      this.analyticsService.getStudyStats().subscribe(stats => {
        this.stats = stats;
      })
    );

    this.subscription.add(
      this.analyticsService.activityLog$.subscribe(activities => {
        this.recentActivities = activities.slice(0, 10); // Show only last 10
      })
    );

    this.subscription.add(
      this.analyticsService.getDailyActivity().subscribe(activity => {
        this.dailyActivity = activity;
      })
    );

    this.analyticsService.startSession();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  formatStudyTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins}m`;
    }
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  getActivityIcon(type: ActivityLog['type']): 'document' | 'pencil' | 'trash' | 'check-circle' | 'task-completed' | 'clock' {
    switch (type) {
      case 'note_created': return 'document';
      case 'note_updated': return 'pencil';
      case 'note_deleted': return 'trash';
      case 'task_created': return 'check-circle';
      case 'task_completed': return 'task-completed';
      case 'session_start':
      case 'session_end': return 'clock';
      default: return 'document';
    }
  }

  getActivityColor(type: ActivityLog['type']): string {
    switch (type) {
      case 'note_created': return 'text-cyan-400';
      case 'note_updated': return 'text-blue-400';
      case 'note_deleted': return 'text-red-400';
      case 'task_created': return 'text-green-400';
      case 'task_completed': return 'text-emerald-400';
      case 'session_start': return 'text-purple-400';
      case 'session_end': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  }

  formatTimestamp(timestamp: Date): string {
    const now = Date.now();
    const diff = now - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }
}
