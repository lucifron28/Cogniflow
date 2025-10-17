import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService, QuizQuestion } from '../../../core/services/ai.service';

type AIAction = 'summarize' | 'explain' | 'quiz' | 'tags';

@Component({
  selector: 'app-ai-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-modal.component.html',
  styleUrl: './ai-modal.component.css'
})
export class AiModalComponent {
  @Input() noteContent: string = '';
  @Input() noteTitle: string = '';
  @Input() selectedText: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() tagsGenerated = new EventEmitter<string[]>();

  isLoading = signal(false);
  currentAction = signal<AIAction | null>(null);
  result = signal<string>('');
  quizQuestions = signal<QuizQuestion[]>([]);
  suggestedTags = signal<string[]>([]);
  error = signal<string>('');

  constructor(private aiService: AIService) {}

  onSummarize() {
    if (!this.noteContent) {
      this.error.set('No content to summarize');
      return;
    }

    this.isLoading.set(true);
    this.currentAction.set('summarize');
    this.error.set('');
    this.result.set('');

    this.aiService.summarizeNote(this.noteContent).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.result.set(response.text);
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
    this.result.set('');

    this.aiService.explainConcept(textToExplain, this.noteContent).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.result.set(response.text);
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
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.questions.length > 0) {
          this.quizQuestions.set(response.questions);
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
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.tags.length > 0) {
          this.suggestedTags.set(response.tags);
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
    this.onClose();
  }

  onClose() {
    this.close.emit();
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  }
}
