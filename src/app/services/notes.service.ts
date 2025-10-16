import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
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
  // orderBy, // requires composite index
  Timestamp,
  CollectionReference,
  DocumentData,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, map, of, catchError } from 'rxjs';
import { Note, NoteMetadata, NoteFilter } from '../core/models/note.model';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private envInjector = inject(EnvironmentInjector);
  private notesCollectionRef: CollectionReference<DocumentData>;

  constructor() {
    // Create collection ref inside injection context
    this.notesCollectionRef = collection(this.firestore, 'notes');
  }

  private get notesCollection(): CollectionReference<DocumentData> {
    return this.notesCollectionRef;
  }

  // Helpers to run Firebase calls inside Angular injection context
  private inCtxObs<T>(op: () => Promise<T>): Observable<T> {
    return new Observable<T>((subscriber) => {
      const promise = runInInjectionContext(this.envInjector, () => {
        return op().then(
          (result) => {
            subscriber.next(result);
            subscriber.complete();
          },
          (err) => {
            subscriber.error(err);
          }
        );
      });
    });
  }

  private inCtxPromise<T>(op: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      runInInjectionContext(this.envInjector, async () => {
        try {
          resolve(await op());
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  private convertTimestamps(data: any): Note {
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as Note;
  }

  // Create
  async createNote(noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to create notes');

    const now = Timestamp.now();
    const note = {
      ...noteData,
      userId,
      createdAt: now,
      updatedAt: now,
      isPinned: noteData.isPinned || false,
      isFavorite: noteData.isFavorite || false,
    };

    const docRef = await this.inCtxPromise(() => addDoc(this.notesCollection, note));
    return docRef.id;
  }

  // Read (Observable)
  getNote(noteId: string): Observable<Note | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return of(null);

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    return this.inCtxObs(() => getDoc(noteDocRef)).pipe(
      map((snap) => {
        if (!snap.exists()) return null;
        const data: any = { id: snap.id, ...snap.data() };
        if (data.userId !== userId) return null;
        return this.convertTimestamps(data);
      }),
      catchError((err) => {
        console.error('Error fetching note:', err);
        return of(null);
      })
    );
  }

  // Read (Promise)
  async getNoteOnce(noteId: string): Promise<Note | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    const snap = await this.inCtxPromise(() => getDoc(noteDocRef));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data['userId'] !== userId) return null;
    return this.convertTimestamps({ id: snap.id, ...data });
  }

  // Update
  async updateNote(noteId: string, updates: Partial<Note>): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to update notes');

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    const snap = await this.inCtxPromise(() => getDoc(noteDocRef));
    if (!snap.exists() || snap.data()['userId'] !== userId) throw new Error('Note not found or access denied');

    const updateData: any = { ...updates, updatedAt: Timestamp.now() };
    delete updateData['id'];
    delete updateData['userId'];
    delete updateData['createdAt'];

    await this.inCtxPromise(() => updateDoc(noteDocRef, updateData));
  }

  // Delete
  async deleteNote(noteId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to delete notes');

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    const snap = await this.inCtxPromise(() => getDoc(noteDocRef));
    if (!snap.exists() || snap.data()['userId'] !== userId) throw new Error('Note not found or access denied');

    await this.inCtxPromise(() => deleteDoc(noteDocRef));
  }

  // List (Observable)
  getNotes(filter?: NoteFilter): Observable<Note[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return of([]);

    let q = query(this.notesCollection, where('userId', '==', userId));
    if (filter?.isPinned !== undefined) q = query(q, where('isPinned', '==', filter.isPinned));
    if (filter?.isFavorite !== undefined) q = query(q, where('isFavorite', '==', filter.isFavorite));
    if (filter?.tags && filter.tags.length > 0) q = query(q, where('tags', 'array-contains', filter.tags[0]));
    // Sorting in-memory to avoid composite index for now

    return this.inCtxObs(() => getDocs(q)).pipe(
      map((qs) => {
        const notes = qs.docs.map((d) => this.convertTimestamps({ id: d.id, ...d.data() }));
        let out = notes;

        if (filter?.tags && filter.tags.length > 1) {
          out = out.filter((n) => filter.tags!.every((t) => n.tags.includes(t)));
        }
        if (filter?.searchQuery) {
          const s = filter.searchQuery.toLowerCase();
          out = out.filter(
            (n) =>
              n.title.toLowerCase().includes(s) ||
              n.content.toLowerCase().includes(s) ||
              n.tags.some((t) => t.toLowerCase().includes(s))
          );
        }

        const sortField = filter?.sortBy || 'updatedAt';
        const sortDirection = filter?.sortOrder || 'desc';
        out.sort((a, b) => {
          const av = a[sortField as keyof Note];
          const bv = b[sortField as keyof Note];
          if (av instanceof Date && bv instanceof Date) {
            return sortDirection === 'desc' ? bv.getTime() - av.getTime() : av.getTime() - bv.getTime();
          }
          if (typeof av === 'string' && typeof bv === 'string') {
            return sortDirection === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
          }
          return 0;
        });

        return out;
      }),
      catchError((err) => {
        console.error('Error fetching notes:', err);
        return of([]);
      })
    );
  }

  // List (Promise)
  async getNotesOnce(filter?: NoteFilter): Promise<Note[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    let q = query(this.notesCollection, where('userId', '==', userId));
    if (filter?.isPinned !== undefined) q = query(q, where('isPinned', '==', filter.isPinned));
    if (filter?.isFavorite !== undefined) q = query(q, where('isFavorite', '==', filter.isFavorite));
    if (filter?.tags && filter.tags.length > 0) q = query(q, where('tags', 'array-contains', filter.tags[0]));

    const qs = await this.inCtxPromise(() => getDocs(q));
    let out = qs.docs.map((d) => this.convertTimestamps({ id: d.id, ...d.data() }));

    if (filter?.tags && filter.tags.length > 1) out = out.filter((n) => filter.tags!.every((t) => n.tags.includes(t)));
    if (filter?.searchQuery) {
      const s = filter.searchQuery.toLowerCase();
      out = out.filter(
        (n) => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s) || n.tags.some((t) => t.toLowerCase().includes(s))
      );
    }

    const sortField = filter?.sortBy || 'updatedAt';
    const sortDirection = filter?.sortOrder || 'desc';
    out.sort((a, b) => {
      const av = a[sortField as keyof Note];
      const bv = b[sortField as keyof Note];
      if (av instanceof Date && bv instanceof Date) {
        return sortDirection === 'desc' ? bv.getTime() - av.getTime() : av.getTime() - bv.getTime();
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      return 0;
    });

    return out;
  }

  // Metadata
  getNotesMetadata(filter?: NoteFilter): Observable<NoteMetadata[]> {
    return this.getNotes(filter).pipe(
      map((notes) =>
        notes.map((n) => ({
          id: n.id!,
          title: n.title,
          tags: n.tags,
          wordCount: n.content.trim().split(/\s+/).length,
          linkedNotesCount: n.linkedNotes.length,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          isPinned: n.isPinned,
          isFavorite: n.isFavorite,
        }))
      )
    );
  }

  // Backlinks
  getBacklinks(noteTitle: string): Observable<Note[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return of([]);

    const q = query(this.notesCollection, where('userId', '==', userId), where('linkedNotes', 'array-contains', noteTitle));
    return this.inCtxObs(() => getDocs(q)).pipe(
      map((qs) => qs.docs.map((d) => this.convertTimestamps({ id: d.id, ...d.data() }))),
      catchError((err) => {
        console.error('Error fetching backlinks:', err);
        return of([]);
      })
    );
  }

  async togglePin(noteId: string): Promise<void> {
    const note = await this.getNoteOnce(noteId);
    if (note) await this.updateNote(noteId, { isPinned: !note.isPinned });
  }

  async toggleFavorite(noteId: string): Promise<void> {
    const note = await this.getNoteOnce(noteId);
    if (note) await this.updateNote(noteId, { isFavorite: !note.isFavorite });
  }

  async getAllTags(): Promise<string[]> {
    const notes = await this.getNotesOnce();
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }
}
