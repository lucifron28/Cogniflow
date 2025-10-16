import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { NotesService } from '../../services/notes.service';
import { NoteMetadata } from '../../core/models/note.model';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './notes.component.html'
})
export class NotesComponent implements OnInit {
  private notesService = inject(NotesService);
  
  notes = signal<NoteMetadata[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadNotes();
  }

  private loadNotes() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Subscribe to notes metadata (real-time updates)
    this.notesService.getNotesMetadata().subscribe({
      next: (notes) => {
        this.notes.set(notes);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading notes:', error);
        this.errorMessage.set('Failed to load notes');
        this.isLoading.set(false);
      }
    });
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  }
}
