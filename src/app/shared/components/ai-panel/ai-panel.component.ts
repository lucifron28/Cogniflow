import { Component, EventEmitter, Input, Output, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked, Marked } from 'marked';
import { AIService, QuizQuestion } from '../../../core/services/ai.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: SafeHtml;
  timestamp: Date;
}

type AIAction = 'chat' | 'summarize' | 'explain' | 'quiz' | 'tags';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-panel.component.html',
  styleUrl: './ai-panel.component.css'
})
export class AiPanelComponent implements AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('resizeHandle') resizeHandle!: ElementRef<HTMLDivElement>;
  
  @Input() noteContent: string = '';
  @Input() noteTitle: string = '';
  @Input() selectedText: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() tagsGenerated = new EventEmitter<string[]>();

  isVisible = signal(true);
  isLoading = signal(false);
  currentAction = signal<AIAction>('chat');
  error = signal<string>('');
  
  // Chat functionality
  chatMessages = signal<ChatMessage[]>([]);
  userMessage = signal('');
  
  // Quick actions
  quizQuestions = signal<QuizQuestion[]>([]);
  suggestedTags = signal<string[]>([]);
  
  // Resizable panel
  panelWidth = signal(450); // Default width
  isResizing = signal(false);
  private shouldScrollToBottom = false;

  constructor(
    private aiService: AIService,
    private sanitizer: DomSanitizer
  ) {
    // No constructor initialization needed
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      const container = this.chatContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  private async renderMarkdown(text: string): Promise<SafeHtml> {
    try {
      // Create a fresh instance of marked with proper configuration
      const markedInstance = new Marked({
        gfm: true,
        breaks: false,
        pedantic: false,
        async: false
      });
      
      const html = await markedInstance.parse(text);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return this.sanitizer.bypassSecurityTrustHtml(text);
    }
  }

  switchToChat() {
    this.currentAction.set('chat');
    this.error.set('');
  }

  async onSendMessage() {
    const message = this.userMessage().trim();
    if (!message || this.isLoading()) return;

    // Add user message
    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      htmlContent: await this.renderMarkdown(message),
      timestamp: new Date()
    };
    this.chatMessages.update(msgs => [...msgs, userMsg]);
    this.userMessage.set('');
    this.shouldScrollToBottom = true;

    // Get AI response
    this.isLoading.set(true);
    this.error.set('');

    const context = this.noteContent ? `\n\nNote context:\nTitle: ${this.noteTitle}\nContent: ${this.noteContent}` : '';
    
    this.aiService.chat(message, context).subscribe({
      next: async (response) => {
        this.isLoading.set(false);
        if (response.success) {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: response.text,
            htmlContent: await this.renderMarkdown(response.text),
            timestamp: new Date()
          };
          this.chatMessages.update(msgs => [...msgs, assistantMsg]);
          this.shouldScrollToBottom = true;
        } else {
          this.error.set(response.error || 'Failed to get response');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to send message');
      }
    });
  }

  clearChat() {
    this.chatMessages.set([]);
    this.error.set('');
  }

  onSummarize() {
    if (!this.noteContent) {
      this.error.set('No content to summarize');
      return;
    }

    this.isLoading.set(true);
    this.currentAction.set('summarize');
    this.error.set('');

    this.aiService.summarizeNote(this.noteContent).subscribe({
      next: async (response) => {
        this.isLoading.set(false);
        if (response.success) {
          // Add as chat message
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: `**Summary:**\n\n${response.text}`,
            htmlContent: await this.renderMarkdown(`**Summary:**\n\n${response.text}`),
            timestamp: new Date()
          };
          this.chatMessages.update(msgs => [...msgs, assistantMsg]);
          this.shouldScrollToBottom = true;
          this.currentAction.set('chat');
        } else {
          this.error.set(response.error || 'Failed to summarize');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to summarize note');
      }
    });
  }

  onExplainConcept() {
    const textToExplain = this.selectedText || this.noteContent.substring(0, 500);
    
    if (!textToExplain) {
      this.error.set('No text selected or available');
      return;
    }

    this.isLoading.set(true);
    this.currentAction.set('explain');
    this.error.set('');

    this.aiService.explainConcept(textToExplain, this.noteContent).subscribe({
      next: async (response) => {
        this.isLoading.set(false);
        if (response.success) {
          // Add as chat message
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: `**Explanation:**\n\n${response.text}`,
            htmlContent: await this.renderMarkdown(`**Explanation:**\n\n${response.text}`),
            timestamp: new Date()
          };
          this.chatMessages.update(msgs => [...msgs, assistantMsg]);
          this.shouldScrollToBottom = true;
          this.currentAction.set('chat');
        } else {
          this.error.set(response.error || 'Failed to explain');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to explain concept');
      }
    });
  }

  onGenerateQuiz() {
    if (!this.noteContent) {
      this.error.set('No content to generate quiz from');
      return;
    }

    this.isLoading.set(true);
    this.currentAction.set('quiz');
    this.error.set('');
    this.quizQuestions.set([]);

    this.aiService.generateQuestions(this.noteContent, 5).subscribe({
      next: async (response) => {
        this.isLoading.set(false);
        if (response.success && response.questions.length > 0) {
          // Store questions for interactive quiz
          this.quizQuestions.set(response.questions);
          
          // Format quiz as interactive markdown (without answers initially)
          let quizContent = '**📝 Interactive Quiz**\n\nTest your knowledge! Click "Show Answer" to reveal each answer.\n\n---\n\n';
          response.questions.forEach((q, index) => {
            quizContent += `**Question ${index + 1}:** ${q.question}\n\n`;
            if (q.options && q.options.length > 0) {
              q.options.forEach(opt => {
                quizContent += `- ${opt}\n`;
              });
              quizContent += '\n';
            }
            // Don't include the answer in the markdown - will be shown via button
            quizContent += `<button class="show-answer-btn" data-index="${index}">🔍 Show Answer</button>\n\n`;
            quizContent += '---\n\n';
          });
          
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: quizContent,
            htmlContent: await this.renderMarkdown(quizContent),
            timestamp: new Date()
          };
          this.chatMessages.update(msgs => [...msgs, assistantMsg]);
          this.shouldScrollToBottom = true;
          this.currentAction.set('chat');
          
          // Add event listeners for show answer buttons after DOM updates
          setTimeout(() => this.attachQuizListeners(), 100);
        } else {
          this.error.set('Failed to generate quiz questions');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to generate quiz');
      }
    });
  }

  private attachQuizListeners() {
    const buttons = this.chatContainer?.nativeElement.querySelectorAll('.show-answer-btn');
    buttons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const index = parseInt(target.getAttribute('data-index') || '0');
        const question = this.quizQuestions()[index];
        
        if (question && question.answer) {
          // Replace button with answer
          const answerDiv = document.createElement('div');
          answerDiv.className = 'quiz-answer';
          answerDiv.innerHTML = `<strong style="color: #22d3ee;">✓ Answer:</strong> ${question.answer}`;
          target.replaceWith(answerDiv);
        }
      });
    });
  }

  onSuggestTags() {
    if (!this.noteContent) {
      this.error.set('No content to analyze');
      return;
    }

    this.isLoading.set(true);
    this.currentAction.set('tags');
    this.error.set('');
    this.suggestedTags.set([]);

    this.aiService.suggestTags(this.noteContent, this.noteTitle).subscribe({
      next: async (response) => {
        this.isLoading.set(false);
        if (response.success && response.tags.length > 0) {
          this.suggestedTags.set(response.tags);
          
          // Show tags in chat
          const tagsContent = `**Suggested Tags:**\n\n${response.tags.map(tag => `\`${tag}\``).join(', ')}\n\nClick "Apply Tags" below to add them to your note.`;
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: tagsContent,
            htmlContent: await this.renderMarkdown(tagsContent),
            timestamp: new Date()
          };
          this.chatMessages.update(msgs => [...msgs, assistantMsg]);
          this.shouldScrollToBottom = true;
          this.currentAction.set('chat');
        } else {
          this.error.set('Failed to suggest tags');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to suggest tags');
      }
    });
  }

  onApplyTags() {
    this.tagsGenerated.emit(this.suggestedTags());
    this.suggestedTags.set([]);
  }

  onClose() {
    this.close.emit();
  }

  // Resize functionality
  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isResizing.set(true);

    const startX = event.clientX;
    const startWidth = this.panelWidth();

    const onMouseMove = (e: MouseEvent) => {
      const diff = startX - e.clientX; // Reversed because panel is on right
      const newWidth = Math.max(300, Math.min(800, startWidth + diff));
      this.panelWidth.set(newWidth);
    };

    const onMouseUp = () => {
      this.isResizing.set(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
}
