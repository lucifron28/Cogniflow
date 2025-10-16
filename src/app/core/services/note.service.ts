import { Injectable } from '@angular/core';
import { Note } from '../models/note.model';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  constructor() {}

  // Firestore CRUD operations will go here
  getNotes() {
    // TODO: Fetch notes from Firestore
    return [];
  }

  getNote(id: string) {
    // TODO: Fetch single note from Firestore
    return null;
  }

  createNote(note: Partial<Note>) {
    // TODO: Create note in Firestore
  }

  updateNote(id: string, note: Partial<Note>) {
    // TODO: Update note in Firestore
  }

  deleteNote(id: string) {
    // TODO: Delete note from Firestore
  }
}
