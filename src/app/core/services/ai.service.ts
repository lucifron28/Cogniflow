import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, retry, retryWhen, mergeMap, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AIResponse {
  text: string;
  success: boolean;
  error?: string;
}

export interface QuizQuestion {
  question: string;
  options?: string[];
  answer?: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  // Use the latest Gemini 2.0 Flash model with v1beta endpoint
  private readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  constructor(private http: HttpClient) {}

  /**
   * Summarize note content
   */
  summarizeNote(content: string): Observable<AIResponse> {
    const prompt = `Summarize the following note in a concise way, highlighting the key points:\n\n${content}`;
    return this.callGeminiAPI(prompt);
  }

  /**
   * Explain a concept from selected text
   */
  explainConcept(concept: string, context?: string): Observable<AIResponse> {
    const prompt = context 
      ? `Explain the following concept in simple terms:\n\n"${concept}"\n\nContext: ${context}`
      : `Explain the following concept in simple terms:\n\n"${concept}"`;
    return this.callGeminiAPI(prompt);
  }

  /**
   * Generate quiz questions from note content
   */
  generateQuestions(content: string, numberOfQuestions: number = 5): Observable<{ questions: QuizQuestion[], success: boolean }> {
    const prompt = `Generate ${numberOfQuestions} study questions based on the following content. Include a mix of multiple-choice, true/false, and short-answer questions. Format as JSON array with structure: [{"question": "...", "type": "multiple-choice|true-false|short-answer", "options": ["A", "B", "C", "D"], "answer": "correct answer"}]\n\nContent:\n${content}`;
    
    return this.callGeminiAPI(prompt).pipe(
      map(response => {
        try {
          // Try to parse JSON from response
          const jsonMatch = response.text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const questions = JSON.parse(jsonMatch[0]);
            return { questions, success: true };
          }
          // Fallback: parse plain text questions
          return this.parseQuestionsFromText(response.text);
        } catch (error) {
          return this.parseQuestionsFromText(response.text);
        }
      }),
      catchError(error => {
        console.error('Quiz generation error:', error);
        return throwError(() => ({ questions: [], success: false, error: error.message }));
      })
    );
  }

  /**
   * Suggest tags based on note content
   */
  suggestTags(content: string, title?: string): Observable<{ tags: string[], success: boolean }> {
    const prompt = title
      ? `Analyze this note and suggest 5-8 relevant tags/keywords. Return only the tags as a comma-separated list.\n\nTitle: ${title}\n\nContent: ${content}`
      : `Analyze this note and suggest 5-8 relevant tags/keywords. Return only the tags as a comma-separated list.\n\nContent: ${content}`;
    
    return this.callGeminiAPI(prompt).pipe(
      map(response => {
        const tags = response.text
          .split(',')
          .map(tag => tag.trim().replace(/[#"']/g, ''))
          .filter(tag => tag.length > 0 && tag.length < 30)
          .slice(0, 8);
        return { tags, success: true };
      }),
      catchError(error => {
        console.error('Tag suggestion error:', error);
        return throwError(() => ({ tags: [], success: false, error: error.message }));
      })
    );
  }

  /**
   * Chat with AI about notes
   */
  chat(message: string, context?: string): Observable<AIResponse> {
    const prompt = context 
      ? `${context}\n\nUser: ${message}\n\nAssistant:`
      : message;
    return this.callGeminiAPI(prompt);
  }

  /**
   * Call Gemini API with rate limiting and retry logic
   */
  private callGeminiAPI(prompt: string): Observable<AIResponse> {
    return new Observable(observer => {
      // Queue the request to prevent concurrent calls
      this.requestQueue = this.requestQueue.then(async () => {
        // Ensure minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();

        // Use the endpoint without the API key in the URL
        const url = this.GEMINI_API_URL;
        
        const body = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        };

        // Use X-goog-api-key header instead of query parameter
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'X-goog-api-key': environment.geminiApiKey
        });

        // Retry logic with exponential backoff
        let attempt = 0;
        while (attempt < this.MAX_RETRIES) {
          try {
            const response = await this.http.post<any>(url, body, { headers }).toPromise();
            
            if (response.candidates && response.candidates.length > 0) {
              const text = response.candidates[0].content.parts[0].text;
              observer.next({ text, success: true });
              observer.complete();
              return;
            } else {
              throw new Error('No response from AI');
            }
          } catch (error: any) {
            attempt++;
            
            // Check if it's a 404 error (invalid endpoint or API key)
            if (error.status === 404) {
              console.error('Gemini API 404 Error - Invalid endpoint or API key:', error);
              observer.error({ 
                text: '', 
                success: false, 
                error: '🔑 Invalid API configuration. Please check your Gemini API key in environment settings.' 
              });
              return;
            }
            
            // Check if it's a rate limit error (429)
            if (error.status === 429) {
              if (attempt < this.MAX_RETRIES) {
                const waitTime = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`Rate limit hit. Retrying in ${waitTime}ms... (Attempt ${attempt}/${this.MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              } else {
                observer.error({ 
                  text: '', 
                  success: false, 
                  error: '⏱️ Rate limit exceeded. Please wait a moment and try again.' 
                });
                return;
              }
            }
            
            // Other errors
            if (attempt >= this.MAX_RETRIES) {
              console.error('Gemini API error:', error);
              const errorMsg = error.error?.error?.message || error.message || 'Failed to get AI response';
              observer.error({ 
                text: '', 
                success: false, 
                error: `❌ ${errorMsg}. Please try again.` 
              });
              return;
            }
            
            // Wait before retry for other errors
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      });
    });
  }

  /**
   * Parse questions from plain text response (fallback)
   */
  private parseQuestionsFromText(text: string): { questions: QuizQuestion[], success: boolean } {
    const questions: QuizQuestion[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentQuestion: Partial<QuizQuestion> | null = null;
    
    for (const line of lines) {
      // Check if line is a question (contains ?)
      if (line.includes('?')) {
        if (currentQuestion) {
          questions.push(currentQuestion as QuizQuestion);
        }
        currentQuestion = {
          question: line.replace(/^\d+\.\s*/, '').trim(),
          type: 'short-answer'
        };
      }
    }
    
    if (currentQuestion) {
      questions.push(currentQuestion as QuizQuestion);
    }
    
    return { questions, success: questions.length > 0 };
  }
}
