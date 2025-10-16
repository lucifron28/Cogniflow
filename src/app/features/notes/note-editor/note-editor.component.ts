import { Component, signal, computed, effect, inject, OnInit, ElementRef, ViewEncapsulation } from '@angular/core';
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

type EditorView = 'split' | 'editor' | 'preview';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.css',
  encapsulation: ViewEncapsulation.None
})
export class NoteEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private notesService = inject(NotesService);

  noteId = signal<string | null>(null);
  title = signal('');
  content = signal('');
  tags = signal<string[]>([]);
  editorView = signal<EditorView>('split');
  isSaving = signal(false);
  isLoading = signal(false);
  lastSaved = signal<Date | null>(null);
  errorMessage = signal<string | null>(null);

  isNewNote = computed(() => !this.noteId());
  wordCount = computed(() => {
    const text = this.content().trim();
    return text ? text.split(/\s+/).length : 0;
  });
  charCount = computed(() => this.content().length);
  
  processedContent = computed(() => {
    let processed = this.content();
    
    processed = processed.replace(/\[\[([^\]]+)\]\]/g, (match, noteName) => {
      return `[${noteName}](#note:${noteName.replace(/\s+/g, '-').toLowerCase()})`;
    });
    
    return processed;
  });

  private sanitizer = inject(DomSanitizer);
  
  constructor() {
    marked.use({
      gfm: true,
      breaks: false
    });

    effect(() => {
      this.content();
      this.editorView();
      
      setTimeout(() => this.highlightCode(), 0);
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

  async loadNote(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const note = await this.notesService.getNoteOnce(id);
      
      if (note) {
        this.title.set(note.title);
        this.content.set(note.content);
        this.tags.set(note.tags);
        this.lastSaved.set(note.updatedAt);
      } else {
        this.errorMessage.set('Note not found');
        // Redirect back to notes list after 2 seconds
        setTimeout(() => this.router.navigate(['/notes']), 2000);
      }
    } catch (error) {
      console.error('Error loading note:', error);
      this.errorMessage.set('Failed to load note');
    } finally {
      this.isLoading.set(false);
    }
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
        content: this.content(),
        tags: this.tags(),
        linkedNotes: this.detectedBacklinks()
      };

      if (this.isNewNote()) {
        // Create new note
        const newNoteId = await this.notesService.createNote(noteData);
        this.noteId.set(newNoteId);
        this.lastSaved.set(new Date());
        
        // Navigate to the new note's URL
        this.router.navigate(['/notes', newNoteId]);
      } else {
        // Update existing note
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

  handlePreviewClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    if (target.tagName === 'A') {
      const href = (target as HTMLAnchorElement).href;
      
      if (href.includes('#note:')) {
        event.preventDefault();
        const noteName = target.textContent || '';
        console.log('Navigate to note:', noteName);
        // TODO: Implement actual navigation to linked note
        // For now, show an alert
        alert(`Would navigate to: ${noteName}\n\n(Navigation will be implemented when notes are stored in Firebase)`);
      }
    }
  }
}
