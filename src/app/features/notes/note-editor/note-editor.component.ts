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
import { AiPanelComponent } from '../../../shared/components/ai-panel/ai-panel.component';
import { ThemeService } from '../../../core/services/theme.service';

type EditorView = 'split' | 'editor' | 'preview';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AiPanelComponent],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.css',
  encapsulation: ViewEncapsulation.None
})
export class NoteEditorComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('markdownPreview') previewRef!: ElementRef<HTMLDivElement>;
  @ViewChild('editorTextarea') editorTextareaRef!: ElementRef<HTMLTextAreaElement>;
  
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
  currentTag = '';
  editorView = signal<EditorView>('split');
  isSaving = signal(false);
  isLoading = signal(false);
  lastSaved = signal<Date | null>(null);
  errorMessage = signal<string | null>(null);
  
  allNotes = signal<Note[]>([]);
  
  showAIPanel = signal(false);
  selectedText = signal<string>('');
  
  private clickListeners = new Map<Element, EventListener>();
  private shouldAttachListeners = false;

  isNewNote = computed(() => !this.noteId());
  wordCount = computed(() => {
    const text = this.content().trim();
    return text ? text.split(/\s+/).length : 0;
  });
  charCount = computed(() => this.content().length);
  
  highlightedContent = computed<SafeHtml>(() => {
    const text = this.content();
    const highlighted = this.highlightMarkdown(text);
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  });
  
  processedContent = computed(() => {
    return this.content();
  });
  
  constructor() {
    const renderer = new marked.Renderer();
    
    // Fix for marked v16+: Custom list renderer that properly handles inline formatting
    renderer.listitem = function(item: any) {
      const { task, checked, tokens } = item;
      
      // Check if tokens contain only inline content or have block content
      const hasBlockContent = tokens.some((t: any) => t.type === 'list' || t.type === 'paragraph');
      
      let text;
      if (hasBlockContent) {
        // Has nested lists or paragraphs, use parse() for block-level content
        text = this.parser.parse(tokens, false);
      } else {
        // Only inline content (text, strong, em, etc.), use parseInline()
        text = this.parser.parseInline(tokens);
      }
      
      if (task) {
        const checkboxHtml = checked 
          ? '<input type="checkbox" checked />' 
          : '<input type="checkbox" />';
        return `<li class="task-list-item">${checkboxHtml} ${text}</li>`;
      }
      return `<li>${text}</li>`;
    };

    // Custom code block renderer with language label and copy button
    renderer.code = (code: any) => {
      const lang = code.lang || 'text';
      const escapedCode = code.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-block-language">${lang}</span>
            <button class="code-block-copy-btn" data-code="${escapedCode.replace(/"/g, '&quot;')}" title="Copy code">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span class="copy-text">Copy</span>
            </button>
          </div>
          <pre class="language-${lang}"><code class="language-${lang}">${escapedCode}</code></pre>
        </div>
      `;
    };

    marked.use({
      gfm: true,
      breaks: false,
      pedantic: false, // Explicitly set to false for better inline formatting
      renderer: renderer
    });

    effect(() => {
      this.content();
      this.editorView();
      
      setTimeout(() => {
        this.highlightCode();
        this.attachCheckboxListeners();
        this.attachCopyButtonListeners();
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
      let html = marked.parse(md) as string;
      
      // Process wiki links AFTER markdown parsing to avoid breaking markdown syntax
      const notes = this.allNotes();
      html = html.replace(/\[\[([^\]]+)\]\]/g, (match, noteName) => {
        const trimmedName = noteName.trim();
        let targetNote: Note | undefined;
        
        // Check if it's a path-based link (starts with /)
        if (trimmedName.startsWith('/')) {
          // For path-based links, we'll mark them specially and resolve them on click
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
      
      return this.sanitizer.bypassSecurityTrustHtml(html);
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

  // Tag management methods
  addTag() {
    const tag = this.currentTag.trim();
    if (!tag) return; // Don't add empty tags
    
    const currentTags = this.tags();
    if (currentTags.includes(tag)) {
      // Tag already exists, don't add duplicate
      this.currentTag = '';
      return;
    }
    
    this.tags.set([...currentTags, tag]);
    this.currentTag = ''; // Clear input
  }

  removeTag(index: number) {
    const currentTags = this.tags();
    this.tags.set(currentTags.filter((_, i) => i !== index));
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

  // AI Panel methods
  toggleAIPanel() {
    // Get selected text from textarea
    if (this.editorTextareaRef) {
      const textarea = this.editorTextareaRef.nativeElement;
      const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      this.selectedText.set(selection);
    }
    this.showAIPanel.set(!this.showAIPanel());
  }

  closeAIPanel() {
    this.showAIPanel.set(false);
  }

  onTagsGenerated(tags: string[]) {
    // Add generated tags to the note
    const existingTags = this.tags();
    const newTags = tags.filter(tag => !existingTags.includes(tag));
    this.tags.set([...existingTags, ...newTags]);
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

    // Cmd/Ctrl + L to toggle AI panel
    if ((event.metaKey || event.ctrlKey) && event.key === 'l') {
      event.preventDefault();
      this.toggleAIPanel();
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

  private attachCopyButtonListeners() {
    const copyButtons = this.elementRef.nativeElement.querySelectorAll('.code-block-copy-btn');
    
    copyButtons.forEach((button: HTMLButtonElement) => {
      // Remove old listener by cloning
      const newButton = button.cloneNode(true) as HTMLButtonElement;
      button.replaceWith(newButton);
      
      newButton.addEventListener('click', () => {
        const encodedCode = newButton.getAttribute('data-code') || '';
        const code = this.decodeHtmlEntities(encodedCode);
        
        navigator.clipboard.writeText(code).then(() => {
          // Visual feedback
          const copyText = newButton.querySelector('.copy-text');
          if (copyText) {
            const originalText = copyText.textContent;
            copyText.textContent = 'Copied!';
            newButton.classList.add('copied');
            
            setTimeout(() => {
              copyText.textContent = originalText;
              newButton.classList.remove('copied');
            }, 2000);
          }
        }).catch(err => {
          console.error('Failed to copy code:', err);
        });
      });
    });
  }

  private decodeHtmlEntities(text: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Sync scroll between textarea and highlighted backdrop
  syncScroll(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const backdrop = textarea.previousElementSibling as HTMLElement;
    if (backdrop) {
      backdrop.scrollTop = textarea.scrollTop;
      backdrop.scrollLeft = textarea.scrollLeft;
    }
  }

  // Markdown syntax highlighting
  private highlightMarkdown(text: string): string {
    if (!text) return '';
    
    // Escape HTML first
    let highlighted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Code blocks (must be before other patterns to avoid conflicts)
    highlighted = highlighted.replace(/^```(\w*)\n([\s\S]*?)^```$/gm, (match, lang, code) => {
      return `<span class="md-code-block">\`\`\`${lang || ''}\n${code}\`\`\`</span>`;
    });
    
    // Headers (must come before bold)
    highlighted = highlighted.replace(/^(#{1,6})\s+(.+)$/gm, '<span class="md-header">$1 $2</span>');
    
    // Task lists (before regular lists)
    highlighted = highlighted.replace(/^(\s*[-*+]\s+\[[ xX]\])\s+(.+)$/gm, '<span class="md-task">$1 $2</span>');
    
    // Lists
    highlighted = highlighted.replace(/^(\s*[-*+])\s+(.+)$/gm, '<span class="md-list">$1 $2</span>');
    highlighted = highlighted.replace(/^(\s*\d+\.)\s+(.+)$/gm, '<span class="md-list">$1 $2</span>');
    
    // Blockquotes
    highlighted = highlighted.replace(/^(&gt;.+)$/gm, '<span class="md-blockquote">$1</span>');
    
    // Horizontal rules
    highlighted = highlighted.replace(/^([-*_]{3,})$/gm, '<span class="md-hr">$1</span>');
    
    // Images (before links)
    highlighted = highlighted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="md-image">![$1]($2)</span>');
    
    // Wiki links
    highlighted = highlighted.replace(/\[\[([^\]]+)\]\]/g, '<span class="md-wiki-link">[[$1]]</span>');
    
    // Links
    highlighted = highlighted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="md-link">[$1]($2)</span>');
    
    // Inline code (before bold/italic to avoid conflicts)
    highlighted = highlighted.replace(/`([^`]+)`/g, '<span class="md-code">`$1`</span>');
    
    // Bold (before italic)
    highlighted = highlighted.replace(/\*\*(.+?)\*\*/g, '<span class="md-bold">**$1**</span>');
    highlighted = highlighted.replace(/__(.+?)__/g, '<span class="md-bold">__$1__</span>');
    
    // Strikethrough
    highlighted = highlighted.replace(/~~(.+?)~~/g, '<span class="md-strikethrough">~~$1~~</span>');
    
    // Italic (after bold to avoid conflicts)
    highlighted = highlighted.replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, '<span class="md-italic">*$1*</span>');
    highlighted = highlighted.replace(/(?<!_)_([^_]+)_(?!_)/g, '<span class="md-italic">_$1_</span>');
    
    return highlighted;
  }
}
