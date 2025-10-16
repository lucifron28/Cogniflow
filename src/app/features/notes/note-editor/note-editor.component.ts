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

  noteId = signal<string | null>(null);
  title = signal('');
  content = signal('');
  tags = signal<string[]>([]);
  editorView = signal<EditorView>('split');
  isSaving = signal(false);
  lastSaved = signal<Date | null>(null);

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
      if (params['id']) {
        this.noteId.set(params['id']);
        this.loadNote(params['id']);
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

  loadNote(id: string) {
    // TODO: Load note from service/Firebase
    this.title.set('Example Note');
    this.content.set(`# Welcome to Cogniflow

This is a **markdown** editor with live preview!

## Features

- Split view (editor | preview)
- Backlinks: [[Another Note]] and [[Meeting Notes]]
- Task support:
  - [ ] Uncompleted task
  - [x] Completed task
  - [ ] Another task to complete
  
\`\`\`typescript
const code = 'syntax highlighting';
console.log('Hello from Cogniflow!');
\`\`\`

> Block quotes look great too!

### More Markdown Features

**Bold text** and *italic text* work perfectly.

1. Numbered lists
2. Are supported
3. Out of the box

---

Links work too: [GitHub](https://github.com)
`);
    this.tags.set(['example', 'markdown']);
  }

  setView(view: EditorView) {
    this.editorView.set(view);
  }

  async saveNote() {
    this.isSaving.set(true);
    
    try {
      // TODO: Implement Firebase save
      const note = {
        id: this.noteId() || this.generateId(),
        title: this.title(),
        content: this.content(),
        tags: this.tags(),
        linkedNotes: this.detectedBacklinks(),
        updatedAt: new Date()
      };
      
      console.log('Saving note:', note);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.lastSaved.set(new Date());
      
      if (this.isNewNote()) {
        this.router.navigate(['/notes', note.id]);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/notes']);
  }

  private generateId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
