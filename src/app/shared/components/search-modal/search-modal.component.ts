import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';

interface SearchResult {
  type: 'note' | 'task' | 'tag';
  id: string;
  title: string;
  preview?: string;
  icon: string;
}

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.css'
})
export class SearchModalComponent {
  themeService = inject(ThemeService);
  
  isOpen = signal(false);
  searchQuery = signal('');
  selectedIndex = signal(0);
  
  // Mock results - will be replaced with actual search
  results = computed<SearchResult[]>(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return [];
    
    // TODO: Replace with actual fuzzy search using fuse.js
    const mockResults: SearchResult[] = [
      { type: 'note', id: '1', title: 'Meeting Notes', preview: 'Discussion about project timeline...', icon: '📝' },
      { type: 'note', id: '2', title: 'Ideas', preview: 'New feature concepts...', icon: '💡' },
      { type: 'task', id: '1', title: 'Review PR #123', preview: 'High priority', icon: '✅' },
      { type: 'tag', id: 'work', title: '#work', preview: '12 notes', icon: '🏷️' },
    ];
    
    return mockResults.filter(r => 
      r.title.toLowerCase().includes(query) || 
      r.preview?.toLowerCase().includes(query)
    );
  });

  constructor(private router: Router) {
    // Listen for open search modal event from sidebar
    if (typeof window !== 'undefined') {
      window.addEventListener('open-search-modal', () => {
        this.open();
      });
    }
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
    }
  }

  open() {
    this.isOpen.set(true);
    this.searchQuery.set('');
    this.selectedIndex.set(0);
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
        this.router.navigate(['/tasks'], { queryParams: { id: result.id } });
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
