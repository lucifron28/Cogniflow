import { Component, signal, computed, effect, inject, OnInit, ElementRef, ViewEncapsulation, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-bash';
import { NotesService } from '../../../services/notes.service';
import { Note } from '../../../core/models/note.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ThemeService } from '../../../core/services/theme.service';

type EditorView = 'split' | 'editor' | 'preview';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.css',
  encapsulation: ViewEncapsulation.None
})
export class NoteEditorComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('markdownPreview') previewRef!: ElementRef<HTMLDivElement>;
  
  private route = inject(ActivatedRoute);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private notesService = inject(NotesService);
  private sanitizer = inject(DomSanitizer);

  noteId = signal<string | null>(null);
  title = signal('');
  content = signal('');
  tags = signal<string[]>([]);
  editorView = signal<EditorView>('split');
  isSaving = signal(false);
  isLoading = signal(false);
  lastSaved = signal<Date | null>(null);
  errorMessage = signal<string | null>(null);
  
  // Store all notes for link resolution
  allNotes = signal<Note[]>([]);
  
  // Track event listeners for cleanup
  private clickListeners = new Map<Element, EventListener>();
  private shouldAttachListeners = false;

  isNewNote = computed(() => !this.noteId());
  wordCount = computed(() => {
    const text = this.content().trim();
    return text ? text.split(/\s+/).length : 0;
  });
  charCount = computed(() => this.content().length);
  
  processedContent = computed(() => {
    let processed = this.content();
    const notes = this.allNotes();
    
    // Replace [[Note Name]] or [[/path/to/note]] with clickable HTML links
    processed = processed.replace(/\[\[([^\]]+)\]\]/g, (match, noteName) => {
      const trimmedName = noteName.trim();
      let targetNote: Note | undefined;
      
      // Check if it's a path-based link (starts with /)
      if (trimmedName.startsWith('/')) {
        // For path-based links, we'll mark them specially and resolve them on click
        // For now, show as valid link (we'll resolve on click)
        return `<a href="javascript:void(0)" 
                   class="wiki-link wiki-link-path" 
                   data-note-path="${trimmedName}"
                   data-note-title="${trimmedName}">
                  ${trimmedName}
                </a>`;
      } else {
        // Title-based link - find by title
        targetNote = notes.find(n => 
          n.title.toLowerCase() === trimmedName.toLowerCase()
        );
      }
      
      if (targetNote && targetNote.id) {
        // Note exists - create clickable link
        return `<a href="javascript:void(0)" 
                   class="wiki-link" 
                   data-note-id="${targetNote.id}"
                   data-note-title="${trimmedName}">
                  ${trimmedName}
                </a>`;
      } else if (!trimmedName.startsWith('/')) {
        // Note doesn't exist and it's not a path - show as broken link
        return `<span class="wiki-link-broken" 
                      title="Note not found: ${trimmedName}">
                  ${trimmedName}
                </span>`;
      }
      
      // Fallback
      return match;
    });
    
    return processed;
  });
  
  constructor() {
    const renderer = new marked.Renderer();
    
    renderer.listitem = (item: any) => {
      const { text, task, checked } = item;
      if (task) {
        const checkboxHtml = checked 
          ? '<input type="checkbox" checked />' 
          : '<input type="checkbox" />';
        return `<li class="task-list-item">${checkboxHtml} ${text}</li>`;
      }
      return `<li>${text}</li>`;
    };

    marked.use({
      gfm: true,
      breaks: false,
      renderer: renderer
    });

    effect(() => {
      this.content();
      this.editorView();
      
      setTimeout(() => {
        this.highlightCode();
        this.attachCheckboxListeners();
      }, 0);
    });
    
    // Trigger listener attachment when content or notes change
    effect(() => {
      this.processedContent();
      this.shouldAttachListeners = true;
    });
  }
  
  renderedHtml = computed<SafeHtml>(() => {
    try {
      const md = this.processedContent();
      const raw = marked.parse(md) as string;
      return this.sanitizer.bypassSecurityTrustHtml(raw);
    } catch (e) {
      console.error('Markdown render error', e);
      return this.sanitizer.bypassSecurityTrustHtml('<pre>Error rendering preview</pre>');
    }
  });
  
  detectedBacklinks = computed(() => {
    const backlinks: string[] = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;
    
    while ((match = regex.exec(this.content())) !== null) {
      if (!backlinks.includes(match[1])) {
        backlinks.push(match[1]);
      }
    }
    
    return backlinks;
  });

  detectedTasks = computed(() => {
    const tasks: { text: string; completed: boolean; line: number }[] = [];
    const lines = this.content().split('\n');
    
    lines.forEach((line, index) => {
      const uncheckedMatch = line.match(/^- \[ \] (.+)/);
      const checkedMatch = line.match(/^- \[x\] (.+)/i);
      
      if (uncheckedMatch) {
        tasks.push({ text: uncheckedMatch[1], completed: false, line: index });
      } else if (checkedMatch) {
        tasks.push({ text: checkedMatch[1], completed: true, line: index });
      }
    });
    
    return tasks;
  });

  ngOnInit() {
    // Load all notes for link resolution
    this.notesService.getNotes().subscribe(notes => {
      this.allNotes.set(notes);
    });
    
    this.route.params.subscribe(params => {
      if (params['id'] && params['id'] !== 'new') {
        this.noteId.set(params['id']);
        this.loadNote(params['id']);
      } else {
        // New note
        this.noteId.set(null);
        this.title.set('');
        this.content.set('');
        this.tags.set([]);
      }
    });
  }
  
  ngAfterViewChecked() {
    // Attach wiki link listeners after view updates
    if (this.shouldAttachListeners && this.previewRef) {
      this.attachWikiLinkListeners();
      this.shouldAttachListeners = false;
    }
  }
  
  ngOnDestroy() {
    // Clean up all event listeners
    this.removeAllListeners();
  }
  
  private attachWikiLinkListeners() {
    if (!this.previewRef?.nativeElement) return;
    
    // Remove old listeners first
    this.removeAllListeners();
    
    // Find all wiki links
    const links = this.previewRef.nativeElement.querySelectorAll('.wiki-link');
    
    links.forEach(link => {
      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const noteId = (e.currentTarget as HTMLElement).getAttribute('data-note-id');
        const notePath = (e.currentTarget as HTMLElement).getAttribute('data-note-path');
        const noteTitle = (e.currentTarget as HTMLElement).getAttribute('data-note-title');
        
        if (noteId) {
          this.navigateToNote(noteId);
        } else if (notePath) {
          this.navigateToNoteByPath(notePath);
        } else if (noteTitle) {
          // Note doesn't exist - could offer to create it
          console.log('Note not found:', noteTitle);
        }
      };
      
      link.addEventListener('click', handler);
      this.clickListeners.set(link, handler);
    });
  }
  
  private removeAllListeners() {
    this.clickListeners.forEach((handler, element) => {
      element.removeEventListener('click', handler as EventListener);
    });
    this.clickListeners.clear();
  }
  
  navigateToNote(noteId: string) {
    // Save current note before navigating
    if (!this.isNewNote() && this.content()) {
      this.saveNote();
    }
    this.router.navigate(['/notes', noteId]);
  }

  async navigateToNoteByPath(path: string) {
    // Save current note before navigating
    if (!this.isNewNote() && this.content()) {
      await this.saveNote();
    }
    
    // Look up note by path
    try {
      const note = await this.notesService.getNoteByPath(path);
      if (note && note.id) {
        this.router.navigate(['/notes', note.id]);
      } else {
        console.warn(`Note not found for path: ${path}`);
        this.errorMessage.set(`Note not found: ${path}`);
        setTimeout(() => this.errorMessage.set(null), 3000);
      }
    } catch (error) {
      console.error('Error navigating to note by path:', error);
      this.errorMessage.set('Failed to navigate to note');
      setTimeout(() => this.errorMessage.set(null), 3000);
    }
  }

  private highlightCode() {
    try {
      const codeBlocks = this.elementRef.nativeElement.querySelectorAll('.markdown-preview pre code[class*="language-"]');
      
      codeBlocks.forEach((block: HTMLElement) => {
        const code = block.textContent || '';
        block.textContent = code;
        
        Prism.highlightElement(block);
      });
    } catch (e) {
      console.error('Syntax highlighting error:', e);
    }
  }

  private loadNote(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.notesService.getNote(id).subscribe({
      next: (note) => {
        if (note) {
          this.title.set(note.title);
          this.content.set(note.content);
          this.tags.set(note.tags);
          this.lastSaved.set(note.updatedAt);
        } else {
          this.errorMessage.set('Note not found');
          setTimeout(() => this.router.navigate(['/notes']), 2000);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading note:', error);
        this.errorMessage.set('Failed to load note');
        this.isLoading.set(false);
      }
    });
  }

  setView(view: EditorView) {
    this.editorView.set(view);
  }

  async saveNote() {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    
    try {
      const noteData = {
        title: this.title() || 'Untitled',
        slug: this.notesService.generateSlug(this.title() || 'Untitled'), // Generate slug from title
        content: this.content(),
        tags: this.tags(),
        linkedNotes: this.detectedBacklinks()
      };

      if (this.isNewNote()) {
        // Create new note
        const newNoteId = await this.notesService.createNote(noteData);
        this.noteId.set(newNoteId);
        this.lastSaved.set(new Date());
        
        this.router.navigate(['/notes', newNoteId]);
      } else {
        await this.notesService.updateNote(this.noteId()!, noteData);
        this.lastSaved.set(new Date());
      }

      console.log('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      this.errorMessage.set('Failed to save note. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/notes']);
  }

  async deleteNote() {
    if (!this.noteId()) return;

    const confirmed = confirm('Are you sure you want to delete this note? This action cannot be undone.');
    if (!confirmed) return;

    this.isSaving.set(true);
    try {
      await this.notesService.deleteNote(this.noteId()!);
      this.router.navigate(['/notes']);
    } catch (error) {
      console.error('Error deleting note:', error);
      this.errorMessage.set('Failed to delete note');
      this.isSaving.set(false);
    }
  }

  // Keyboard shortcuts
  handleKeyDown(event: KeyboardEvent) {
    // Cmd/Ctrl + S to save
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      this.saveNote();
    }
    
    // Cmd/Ctrl + E to toggle view
    if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
      event.preventDefault();
      this.cycleView();
    }
  }

  private cycleView() {
    const views: EditorView[] = ['split', 'editor', 'preview'];
    const currentIndex = views.indexOf(this.editorView());
    const nextIndex = (currentIndex + 1) % views.length;
    this.setView(views[nextIndex]);
  }

  private attachCheckboxListeners() {
    const checkboxes = this.elementRef.nativeElement.querySelectorAll('.markdown-preview input[type="checkbox"]');
    
    checkboxes.forEach((checkbox: HTMLInputElement, index: number) => {
      checkbox.setAttribute('data-checkbox-index', index.toString());
      
      const newCheckbox = checkbox.cloneNode(true) as HTMLInputElement;
      checkbox.replaceWith(newCheckbox);
    });
    
    const freshCheckboxes = this.elementRef.nativeElement.querySelectorAll('.markdown-preview input[type="checkbox"]');
    
    freshCheckboxes.forEach((checkbox: HTMLInputElement) => {
      checkbox.addEventListener('change', (event) => {
        event.stopPropagation();
        this.toggleCheckbox(checkbox);
      });
    });
  }

  toggleCheckbox(checkbox: HTMLInputElement) {
    // Get the checkbox index from the data attribute
    const checkboxIndexStr = checkbox.getAttribute('data-checkbox-index');
    if (!checkboxIndexStr) {
      console.warn('Checkbox index not found');
      return;
    }
    
    const checkboxIndex = parseInt(checkboxIndexStr, 10);
    const isChecked = checkbox.checked;
    
    // Find the corresponding line in the markdown
    const lines = this.content().split('\n');
    let checkboxCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const uncheckedMatch = line.match(/^(\s*)- \[ \] (.+)/);
      const checkedMatch = line.match(/^(\s*)- \[x\] (.+)/i);
      
      if (uncheckedMatch || checkedMatch) {
        if (checkboxCount === checkboxIndex) {
          // Toggle this checkbox based on its current state
          if (isChecked) {
            // Was unchecked, now checked - update to [x]
            lines[i] = line.replace(/- \[ \]/, '- [x]');
          } else {
            // Was checked, now unchecked - update to [ ]
            lines[i] = line.replace(/- \[x\]/i, '- [ ]');
          }
          
          console.log('Toggling checkbox', checkboxIndex, 'from', line, 'to', lines[i]);
          break;
        }
        checkboxCount++;
      }
    }
    
    // Update the content
    this.content.set(lines.join('\n'));
  }
}
