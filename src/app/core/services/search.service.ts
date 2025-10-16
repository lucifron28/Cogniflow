import { Injectable } from '@angular/core';
import { Note } from '../models/note.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor() {}

  // Fuse.js search logic will go here
  searchNotes(query: string, notes: Note[]) {
    // TODO: Implement fuzzy search with Fuse.js
    return [];
  }

  searchByTags(tags: string[], notes: Note[]) {
    // TODO: Filter notes by tags
    return [];
  }
}
