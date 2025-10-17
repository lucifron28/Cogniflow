import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, of, take, catchError } from 'rxjs';
import { Note } from '../models/note.model';
import { NotesService } from '../services/notes.service';

export const noteResolver: ResolveFn<Note | null> = (route): Observable<Note | null> => {
  const notesService = inject(NotesService);
  const noteId = route.paramMap.get('id');
  
  if (!noteId || noteId === 'new') {
    return of(null);
  }
  
  // Get note from cache/listener - will be instant if cached
  return notesService.getNote(noteId).pipe(
    take(1), // Take first emission (from cache if available)
    catchError(() => of(null))
  );
};
