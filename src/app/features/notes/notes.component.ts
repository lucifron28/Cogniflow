import { Component, signal, inject, OnInit, computed, HostListener, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { NotesService } from '../../services/notes.service';
import { FolderService } from '../../services/folder.service';
import { NoteMetadata, Folder } from '../../core/models/note.model';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.css'
})
export class NotesComponent implements OnInit, OnDestroy {
  private notesService = inject(NotesService);
  private folderService = inject(FolderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  allNotes = signal<NoteMetadata[]>([]);
  allFolders = signal<Folder[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  
  // Current folder (null = root/all notes)
  currentFolderId = signal<string | null>(null);
  
  // Sorting
  sortBy = signal<'updatedAt' | 'createdAt' | 'title' | 'wordCount'>('updatedAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  
  // View mode
  viewMode = signal<'grid' | 'list'>('grid');
  
  // Keyboard navigation
  selectedIndex = signal<number>(-1);
  
  // Breadcrumb path
  breadcrumbs = computed(() => {
    const folderId = this.currentFolderId();
    if (!folderId) {
      return []; // Empty array when viewing all notes
    }
    
    const folders = this.allFolders();
    const path: { name: string; path: string; id: string }[] = [];
    
    let currentId: string | null = folderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      
      path.unshift({
        name: folder.name,
        path: `/notes/folder/${folder.id}`,
        id: folder.id
      });
      currentId = folder.parentId;
    }
    
    return path;
  });
  
  // Computed filtered and sorted notes
  filteredNotes = computed(() => {
    let notes = [...this.allNotes()];
    const folderId = this.currentFolderId();
    
    // Filter by folder
    if (folderId) {
      // Show only notes in this specific folder
      notes = notes.filter(note => note.folderId === folderId);
    }
    // If no folder selected, show ALL notes (don't filter)
    
    // Sort
    const sortField = this.sortBy();
    const order = this.sortOrder();
    
    notes.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return order === 'desc' ? bVal.getTime() - aVal.getTime() : aVal.getTime() - bVal.getTime();
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      }
      
      return 0;
    });
    
    return notes;
  });
  
  constructor() {
    // Watch for route param changes
    effect(() => {
      this.route.params.subscribe(params => {
        this.currentFolderId.set(params['folderId'] || null);
      });
    });
  }

  ngOnInit() {
    this.loadData();
  }
  
  ngOnDestroy() {
    // Cleanup if needed
  }

  private loadData() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Subscribe to folders
    this.folderService.getFolders().subscribe({
      next: (folders) => {
        this.allFolders.set(folders);
      },
      error: (error) => {
        console.error('Error loading folders:', error);
      }
    });

    // Subscribe to notes metadata (real-time updates)
    this.notesService.getNotesMetadata().subscribe({
      next: (notes) => {
        this.allNotes.set(notes);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading notes:', error);
        this.errorMessage.set('Failed to load notes');
        this.isLoading.set(false);
      }
    });
  }
  
  onSortChange(field: 'updatedAt' | 'createdAt' | 'title' | 'wordCount') {
    if (this.sortBy() === field) {
      // Toggle order if same field
      this.sortOrder.set(this.sortOrder() === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('desc');
    }
  }
  
  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
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
  
  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const notes = this.filteredNotes();
    if (notes.length === 0) return;
    
    // Ignore if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    // Cmd/Ctrl + N: New note
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault();
      this.router.navigate(['/notes/new']);
      return;
    }
    
    // Arrow navigation
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = this.selectedIndex();
      const newIndex = currentIndex < notes.length - 1 ? currentIndex + 1 : 0;
      this.selectedIndex.set(newIndex);
      this.scrollToSelectedNote(newIndex);
      return;
    }
    
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = this.selectedIndex();
      const newIndex = currentIndex > 0 ? currentIndex - 1 : notes.length - 1;
      this.selectedIndex.set(newIndex);
      this.scrollToSelectedNote(newIndex);
      return;
    }
    
    // Enter: Open selected note
    if (event.key === 'Enter' && this.selectedIndex() >= 0) {
      event.preventDefault();
      const selectedNote = notes[this.selectedIndex()];
      if (selectedNote) {
        this.router.navigate(['/notes', selectedNote.id]);
      }
      return;
    }
    
    // Delete: Delete selected note (with confirmation)
    if (event.key === 'Delete' && this.selectedIndex() >= 0) {
      event.preventDefault();
      const selectedNote = notes[this.selectedIndex()];
      if (selectedNote) {
        this.deleteNoteWithConfirmation(selectedNote);
      }
      return;
    }
  }
  
  private scrollToSelectedNote(index: number) {
    // Scroll the selected card into view
    setTimeout(() => {
      const cards = document.querySelectorAll('.note-card');
      const selectedCard = cards[index] as HTMLElement;
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  }
  
  private async deleteNoteWithConfirmation(note: NoteMetadata) {
    const confirmed = confirm(`Are you sure you want to delete "${note.title || 'Untitled'}"?`);
    if (confirmed) {
      try {
        await this.notesService.deleteNote(note.id);
        // Reset selection
        this.selectedIndex.set(-1);
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note. Please try again.');
      }
    }
  }
}
