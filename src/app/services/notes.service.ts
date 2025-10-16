import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  CollectionReference,
  DocumentReference,
  DocumentData,
  collectionData,
  docData
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, from, map, switchMap, of, catchError } from 'rxjs';
import { Note, NoteMetadata, NoteFilter } from '../core/models/note.model';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  private get notesCollection(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'notes');
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /**
   * Convert Firestore Timestamp to Date
   */
  private convertTimestamps(data: any): Note {
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as Note;
  }

  /**
   * Create a new note
   */
  async createNote(noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to create notes');
    }

    const now = Timestamp.now();
    const note = {
      ...noteData,
      userId,
      createdAt: now,
      updatedAt: now,
      isPinned: noteData.isPinned || false,
      isFavorite: noteData.isFavorite || false
    };

    const docRef = await addDoc(this.notesCollection, note);
    return docRef.id;
  }

  /**
   * Get a single note by ID
   */
  getNote(noteId: string): Observable<Note | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of(null);
    }

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    return docData(noteDocRef, { idField: 'id' }).pipe(
      map((data: any) => {
        if (!data || data.userId !== userId) {
          return null;
        }
        return this.convertTimestamps(data);
      }),
      catchError(error => {
        console.error('Error fetching note:', error);
        return of(null);
      })
    );
  }

  /**
   * Get a single note by ID (Promise version)
   */
  async getNoteOnce(noteId: string): Promise<Note | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return null;
    }

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    const docSnap = await getDoc(noteDocRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    if (data['userId'] !== userId) {
      return null;
    }

    return this.convertTimestamps({ id: docSnap.id, ...data });
  }

  /**
   * Update an existing note
   */
  async updateNote(noteId: string, updates: Partial<Note>): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to update notes');
    }

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    
    // Verify ownership
    const noteSnap = await getDoc(noteDocRef);
    if (!noteSnap.exists() || noteSnap.data()['userId'] !== userId) {
      throw new Error('Note not found or access denied');
    }

    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    // Remove fields that shouldn't be updated
    delete updateData['id'];
    delete updateData['userId'];
    delete updateData['createdAt'];

    await updateDoc(noteDocRef, updateData);
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to delete notes');
    }

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    
    // Verify ownership
    const noteSnap = await getDoc(noteDocRef);
    if (!noteSnap.exists() || noteSnap.data()['userId'] !== userId) {
      throw new Error('Note not found or access denied');
    }

    await deleteDoc(noteDocRef);
  }

  /**
   * Get all notes for current user with optional filtering
   */
  getNotes(filter?: NoteFilter): Observable<Note[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of([]);
    }

    let q = query(
      this.notesCollection,
      where('userId', '==', userId)
    );

    // Apply filters
    if (filter?.isPinned !== undefined) {
      q = query(q, where('isPinned', '==', filter.isPinned));
    }
    if (filter?.isFavorite !== undefined) {
      q = query(q, where('isFavorite', '==', filter.isFavorite));
    }
    if (filter?.tags && filter.tags.length > 0) {
      // Note: Firestore 'array-contains' only works for single values
      // For multiple tags, we'll filter in memory
      q = query(q, where('tags', 'array-contains', filter.tags[0]));
    }

    // Apply sorting
    const sortField = filter?.sortBy || 'updatedAt';
    const sortDirection = filter?.sortOrder || 'desc';
    q = query(q, orderBy(sortField, sortDirection));

    return collectionData(q, { idField: 'id' }).pipe(
      map((notes: any[]) => {
        let filteredNotes = notes.map(note => this.convertTimestamps(note));

        // Additional filtering for multiple tags
        if (filter?.tags && filter.tags.length > 1) {
          filteredNotes = filteredNotes.filter(note => 
            filter.tags!.every(tag => note.tags.includes(tag))
          );
        }

        // Search query filtering
        if (filter?.searchQuery) {
          const searchLower = filter.searchQuery.toLowerCase();
          filteredNotes = filteredNotes.filter(note => 
            note.title.toLowerCase().includes(searchLower) ||
            note.content.toLowerCase().includes(searchLower) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchLower))
          );
        }

        return filteredNotes;
      }),
      catchError(error => {
        console.error('Error fetching notes:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all notes (Promise version)
   */
  async getNotesOnce(filter?: NoteFilter): Promise<Note[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    let q = query(
      this.notesCollection,
      where('userId', '==', userId)
    );

    // Apply filters
    if (filter?.isPinned !== undefined) {
      q = query(q, where('isPinned', '==', filter.isPinned));
    }
    if (filter?.isFavorite !== undefined) {
      q = query(q, where('isFavorite', '==', filter.isFavorite));
    }
    if (filter?.tags && filter.tags.length > 0) {
      q = query(q, where('tags', 'array-contains', filter.tags[0]));
    }

    const sortField = filter?.sortBy || 'updatedAt';
    const sortDirection = filter?.sortOrder || 'desc';
    q = query(q, orderBy(sortField, sortDirection));

    const querySnapshot = await getDocs(q);
    let notes = querySnapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() })
    );

    // Additional filtering for multiple tags
    if (filter?.tags && filter.tags.length > 1) {
      notes = notes.filter(note => 
        filter.tags!.every(tag => note.tags.includes(tag))
      );
    }

    // Search query filtering
    if (filter?.searchQuery) {
      const searchLower = filter.searchQuery.toLowerCase();
      notes = notes.filter(note => 
        note.title.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return notes;
  }

  /**
   * Get notes metadata (lightweight version for lists)
   */
  getNotesMetadata(filter?: NoteFilter): Observable<NoteMetadata[]> {
    return this.getNotes(filter).pipe(
      map(notes => notes.map(note => ({
        id: note.id!,
        title: note.title,
        tags: note.tags,
        wordCount: note.content.trim().split(/\s+/).length,
        linkedNotesCount: note.linkedNotes.length,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite
      })))
    );
  }

  /**
   * Find notes that link to a specific note (backlinks)
   */
  getBacklinks(noteTitle: string): Observable<Note[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of([]);
    }

    const q = query(
      this.notesCollection,
      where('userId', '==', userId),
      where('linkedNotes', 'array-contains', noteTitle)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((notes: any[]) => notes.map(note => this.convertTimestamps(note))),
      catchError(error => {
        console.error('Error fetching backlinks:', error);
        return of([]);
      })
    );
  }

  /**
   * Toggle pin status
   */
  async togglePin(noteId: string): Promise<void> {
    const note = await this.getNoteOnce(noteId);
    if (note) {
      await this.updateNote(noteId, { isPinned: !note.isPinned });
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(noteId: string): Promise<void> {
    const note = await this.getNoteOnce(noteId);
    if (note) {
      await this.updateNote(noteId, { isFavorite: !note.isFavorite });
    }
  }

  /**
   * Get all unique tags from user's notes
   */
  async getAllTags(): Promise<string[]> {
    const notes = await this.getNotesOnce();
    const tagsSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }
}
