import { Injectable, inject, EnvironmentInjector, runInInjectionContext, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  // orderBy, // requires composite index
  Timestamp,
  CollectionReference,
  DocumentData,
  Unsubscribe,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, BehaviorSubject, ReplaySubject, map, of, catchError, shareReplay, switchMap, filter, take } from 'rxjs';
import { Note, NoteMetadata, NoteFilter, Folder } from '../models/note.model';
import { FolderService } from './folder.service';

@Injectable({ providedIn: 'root' })
export class NotesService implements OnDestroy {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private envInjector = inject(EnvironmentInjector);
  private folderService = inject(FolderService);
  private notesCollectionRef: CollectionReference<DocumentData>;

  private notesSubject = new BehaviorSubject<Note[]>([]);
  private notesListener: Unsubscribe | null = null;
  
  private noteCache = new Map<string, ReplaySubject<Note | null>>();
  private noteListeners = new Map<string, Unsubscribe>();
  
  private authReady = new BehaviorSubject<boolean>(false);

  constructor() {
    this.notesCollectionRef = collection(this.firestore, 'notes');
    
    this.auth.onAuthStateChanged(user => {
      this.authReady.next(true);
      
      if (user) {
        this.startNotesListener();
      } else {
        this.notesListener?.();
        this.notesListener = null;
        this.notesSubject.next([]);
        
        this.noteListeners.forEach(unsub => unsub());
        this.noteListeners.clear();
        this.noteCache.forEach(subject => subject.complete());
        this.noteCache.clear();
      }
    });
  }

  ngOnDestroy() {
    this.notesListener?.();
    this.noteListeners.forEach(unsub => unsub());
    this.noteCache.forEach(subject => subject.complete());
  }

  private get notesCollection(): CollectionReference<DocumentData> {
    return this.notesCollectionRef;
  }

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

  private startNotesListener(): void {
    if (this.notesListener) {
      return;
    }
    
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.notesSubject.next([]);
      return;
    }

    const q = query(this.notesCollection, where('userId', '==', userId));
    
    runInInjectionContext(this.envInjector, () => {
      this.notesListener = onSnapshot(
        q,
        (snapshot) => {
          const notes = snapshot.docs.map(d => this.convertTimestamps({ id: d.id, ...d.data() }));
          this.notesSubject.next(notes);
          console.log('Notes updated:', notes.length, 'notes loaded');
        },
        (error) => {
          console.error('Error in notes listener:', error);
          this.notesSubject.next([]);
        }
      );
    });
  }

  private startNoteListener(noteId: string): Observable<Note | null> {
    if (this.noteCache.has(noteId)) {
      return this.noteCache.get(noteId)!.asObservable();
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      const subject = new ReplaySubject<Note | null>(1);
      subject.next(null);
      this.noteCache.set(noteId, subject);
      return subject.asObservable();
    }

    const subject = new ReplaySubject<Note | null>(1);
    this.noteCache.set(noteId, subject);

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    
    runInInjectionContext(this.envInjector, () => {
      const unsubscribe = onSnapshot(
        noteDocRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            subject.next(null);
            return;
          }
          const data: any = { id: snapshot.id, ...snapshot.data() };
          if (data.userId !== userId) {
            subject.next(null);
            return;
          }
          subject.next(this.convertTimestamps(data));
        },
        (error) => {
          console.error('Error in note listener:', error);
          subject.next(null);
        }
      );
      this.noteListeners.set(noteId, unsubscribe);
    });

    return subject.asObservable();
  }

  private invalidateNoteCache(noteId: string): void {
    const subject = this.noteCache.get(noteId);
    if (subject) {
      const unsubscribe = this.noteListeners.get(noteId);
      unsubscribe?.();
      this.noteListeners.delete(noteId);
      subject.complete();
      this.noteCache.delete(noteId);
    }
  }

  async createNote(noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to create notes');

    const now = Timestamp.now();
    const note = {
      ...noteData,
      slug: noteData.slug || this.generateSlug(noteData.title), // Auto-generate slug if not provided
      userId,
      createdAt: now,
      updatedAt: now,
      isPinned: noteData.isPinned || false,
      isFavorite: noteData.isFavorite || false,
    };

    const docRef = await this.inCtxPromise(() => addDoc(this.notesCollection, note));
    return docRef.id;
  }

  getNote(noteId: string): Observable<Note | null> {
    return this.authReady.pipe(
      filter(ready => ready),
      take(1),
      switchMap(() => this.startNoteListener(noteId))
    );
  }

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

  async deleteNote(noteId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to delete notes');

    const noteDocRef = doc(this.firestore, `notes/${noteId}`);
    const snap = await this.inCtxPromise(() => getDoc(noteDocRef));
    if (!snap.exists() || snap.data()['userId'] !== userId) throw new Error('Note not found or access denied');

    await this.inCtxPromise(() => deleteDoc(noteDocRef));
    
    this.invalidateNoteCache(noteId);
  }

  getNotes(filter?: NoteFilter): Observable<Note[]> {
    return this.notesSubject.asObservable().pipe(
      map((notes) => {
        let out = notes;

        if (filter?.isPinned !== undefined) {
          out = out.filter(n => n.isPinned === filter.isPinned);
        }
        if (filter?.isFavorite !== undefined) {
          out = out.filter(n => n.isFavorite === filter.isFavorite);
        }
        if (filter?.tags && filter.tags.length > 0) {
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
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

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

  getNotesMetadata(filter?: NoteFilter): Observable<NoteMetadata[]> {
    return this.getNotes(filter).pipe(
      map((notes) =>
        notes.map((n) => ({
          id: n.id!,
          title: n.title,
          slug: n.slug,
          tags: n.tags,
          wordCount: n.content.trim().split(/\s+/).length,
          linkedNotesCount: n.linkedNotes.length,
          contentPreview: this.generateContentPreview(n.content),
          folderId: n.folderId,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          isPinned: n.isPinned,
          isFavorite: n.isFavorite,
        }))
      )
    );
  }

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

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '');  // Trim hyphens from start/end
  }

  generateContentPreview(content: string, maxLength: number = 150): string {
    if (!content || content.trim().length === 0) {
      return '';
    }

    // Remove markdown syntax for cleaner preview
    let preview = content
      .replace(/#{1,6}\s/g, '')        // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1')     // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1') // Remove code blocks
      .replace(/[-*+]\s/g, '')         // Remove list markers
      .replace(/>\s/g, '')             // Remove blockquotes
      .replace(/\n+/g, ' ')            // Replace newlines with spaces
      .trim();

    // Truncate to max length
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength).trim() + '...';
    }

    return preview;
  }

  async buildNotePath(note: Note, folders?: Folder[]): Promise<string> {
    let resolvedFolders = folders;
    if (!resolvedFolders) {
      resolvedFolders = await this.folderService.getFoldersOnce();
    }

    const slug = note.slug || this.generateSlug(note.title);
    
    if (!note.folderId) {
      return `/${slug}`;
    }

    const folderPath: string[] = [];
    let currentFolderId: string | null = note.folderId;
    
    while (currentFolderId) {
      const folder = resolvedFolders.find(f => f.id === currentFolderId);
      if (!folder) break;
      
      folderPath.unshift(this.generateSlug(folder.name));
      currentFolderId = folder.parentId;
    }

    return `/${folderPath.join('/')}/${slug}`;
  }

  async getNoteByPath(path: string): Promise<Note | null> {
    const notes = await this.getNotesOnce();
    const folders = await this.folderService.getFoldersOnce();

    const normalizedPath = path.replace(/^\/+|\/+$/g, '').toLowerCase();
    const pathParts = normalizedPath.split('/');

    for (const note of notes) {
      const notePath = await this.buildNotePath(note, folders);
      const notePathNormalized = notePath.replace(/^\/+|\/+$/g, '').toLowerCase();
      
      if (notePathNormalized === normalizedPath) {
        return note;
      }
    }

    return null;
  }

  async getNoteByIdOrPath(idOrPath: string): Promise<Note | null> {
    if (idOrPath.includes('/')) {
      return this.getNoteByPath(idOrPath);
    }
    
    return this.getNoteOnce(idOrPath);
  }
}
