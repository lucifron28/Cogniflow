import { Component, signal, computed, HostListener, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent, IconName } from '../icon/icon.component';
import { NotesService } from '../../../core/services/notes.service';
import { Note } from '../../../core/models/note.model';
import Fuse from 'fuse.js';

interface SearchResult {
  type: 'note' | 'task' | 'tag';
  id: string;
  title: string;
  preview?: string;
  icon: IconName;
  score?: number;
}

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.css'
})
export class SearchModalComponent {
  themeService = inject(ThemeService);
  private notesService = inject(NotesService);
  
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  isOpen = signal(false);
  searchQuery = signal('');
  selectedIndex = signal(0);
  
  // All notes for searching
  private allNotes = signal<Note[]>([]);
  
  // Fuse.js instance
  private fuse: Fuse<SearchResult> | null = null;
  
  // Search results using Fuse.js
  results = computed<SearchResult[]>(() => {
    const query = this.searchQuery().trim();
    if (!query) return [];
    
    if (!this.fuse) return [];
    
    // Perform fuzzy search
    const fuseResults = this.fuse.search(query, { limit: 10 });
    
    return fuseResults.map(result => ({
      ...result.item,
      score: result.score
    }));
  });

  constructor(private router: Router) {
    // Listen for open search modal event from sidebar
    if (typeof window !== 'undefined') {
      window.addEventListener('open-search-modal', () => {
        this.open();
      });
    }
    
    // Subscribe to notes and build search index
    this.notesService.getNotes().subscribe(notes => {
      this.allNotes.set(notes);
      this.buildSearchIndex(notes);
    });
  }
  
  private buildSearchIndex(notes: Note[]): void {
    // Convert notes to searchable results
    const searchableItems: SearchResult[] = [];
    
    // Add notes
    notes.forEach(note => {
      searchableItems.push({
        type: 'note',
        id: note.id!,
        title: note.title,
        preview: this.truncateContent(note.content, 60),
        icon: 'document'
      });
    });
    
    // Add tasks (extract from notes)
    notes.forEach(note => {
      const tasks = this.extractTasks(note.content);
      tasks.forEach((task, index) => {
        searchableItems.push({
          type: 'task',
          id: `${note.id}-task-${index}`,
          title: task.text,
          preview: `In: ${note.title}`,
          icon: task.completed ? 'task-completed' : 'task'
        });
      });
    });
    
    // Add tags
    const tagsMap = new Map<string, number>();
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1);
      });
    });
    
    tagsMap.forEach((count, tag) => {
      searchableItems.push({
        type: 'tag',
        id: tag,
        title: `#${tag}`,
        preview: `${count} note${count !== 1 ? 's' : ''}`,
        icon: 'tag'
      });
    });
    
    // Configure Fuse.js
    this.fuse = new Fuse(searchableItems, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'preview', weight: 0.3 }
      ],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true
    });
  }
  
  private truncateContent(content: string, maxLength: number): string {
    const trimmed = content.trim().replace(/\n/g, ' ');
    if (trimmed.length <= maxLength) return trimmed;
    return trimmed.substring(0, maxLength) + '...';
  }
  
  private extractTasks(content: string): Array<{ text: string; completed: boolean }> {
    const tasks: Array<{ text: string; completed: boolean }> = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const uncheckedMatch = line.match(/^- \[ \] (.+)/);
      const checkedMatch = line.match(/^- \[x\] (.+)/i);
      
      if (uncheckedMatch) {
        tasks.push({ text: uncheckedMatch[1], completed: false });
      } else if (checkedMatch) {
        tasks.push({ text: checkedMatch[1], completed: true });
      }
    });
    
    return tasks;
  }

  // Cmd+K / Ctrl+K to open
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Cmd+K or Ctrl+K
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.toggle();
    }
    
    // ESC to close
    if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
    
    // Arrow keys for navigation
    if (!this.isOpen()) return;
    
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const maxIndex = this.results().length - 1;
      this.selectedIndex.update(i => Math.min(i + 1, maxIndex));
    }
    
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => Math.max(i - 1, 0));
    }
    
    // Enter to select
    if (event.key === 'Enter') {
      event.preventDefault();
      this.selectResult(this.selectedIndex());
    }
  }

  toggle() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.searchQuery.set('');
      this.selectedIndex.set(0);
      // Focus the input after the DOM updates
      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      });
    }
  }

  open() {
    this.isOpen.set(true);
    this.searchQuery.set('');
    this.selectedIndex.set(0);
    // Focus the input after the DOM updates
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    });
  }

  close() {
    this.isOpen.set(false);
  }

  selectResult(index: number) {
    const result = this.results()[index];
    if (!result) return;
    
    switch (result.type) {
      case 'note':
        this.router.navigate(['/notes', result.id]);
        break;
      case 'task':
        // Extract note ID from task ID (format: noteId-task-index)
        const noteId = result.id.split('-task-')[0];
        this.router.navigate(['/notes', noteId]);
        break;
      case 'tag':
        this.router.navigate(['/notes'], { queryParams: { tag: result.id } });
        break;
    }
    
    this.close();
  }

  onBackdropClick() {
    this.close();
  }

  onModalClick(event: Event) {
    event.stopPropagation();
  }
}
