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
  onSnapshot,
  query,
  where,
  Timestamp,
  CollectionReference,
  DocumentData,
  Unsubscribe,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, BehaviorSubject } from 'rxjs';
import { Folder } from '../core/models/note.model';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private envInjector = inject(EnvironmentInjector);
  private foldersCollectionRef: CollectionReference<DocumentData>;

  private foldersSubject = new BehaviorSubject<Folder[]>([]);
  private foldersListener: Unsubscribe | null = null;

  constructor() {
    this.foldersCollectionRef = collection(this.firestore, 'folders');
    
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.startFoldersListener();
      } else {
        this.foldersListener?.();
        this.foldersListener = null;
        this.foldersSubject.next([]);
      }
    });
  }

  private get foldersCollection(): CollectionReference<DocumentData> {
    return this.foldersCollectionRef;
  }

  private getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  private convertTimestamps(data: any): Folder {
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as Folder;
  }

  private startFoldersListener(): void {
    if (this.foldersListener) return;
    
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.foldersSubject.next([]);
      return;
    }

    const q = query(this.foldersCollection, where('userId', '==', userId));
    
    runInInjectionContext(this.envInjector, () => {
      this.foldersListener = onSnapshot(
        q,
        (snapshot) => {
          const folders = snapshot.docs.map(d => this.convertTimestamps({ id: d.id, ...d.data() }));
          this.foldersSubject.next(folders);
          console.log('Folders updated:', folders.length, 'folders loaded');
        },
        (error) => {
          console.error('Error in folders listener:', error);
          this.foldersSubject.next([]);
        }
      );
    });
  }

  async createFolder(name: string, parentId: string | null = null): Promise<string> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to create folders');

    const now = Timestamp.now();
    const folder: Omit<Folder, 'id'> = {
      name,
      parentId,
      userId,
      createdAt: now as any,
      updatedAt: now as any,
    };

    const docRef = await runInInjectionContext(this.envInjector, () => 
      addDoc(this.foldersCollection, folder)
    );
    return docRef.id;
  }

  getFolders(): Observable<Folder[]> {
    return this.foldersSubject.asObservable();
  }

  async getFoldersOnce(): Promise<Folder[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    const q = query(this.foldersCollection, where('userId', '==', userId));
    const snapshot = await runInInjectionContext(this.envInjector, () => getDocs(q));
    return snapshot.docs.map(d => this.convertTimestamps({ id: d.id, ...d.data() }));
  }

  async getFolder(folderId: string): Promise<Folder | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    const folderDocRef = doc(this.firestore, `folders/${folderId}`);
    const snap = await runInInjectionContext(this.envInjector, () => getDoc(folderDocRef));
    
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data['userId'] !== userId) return null;
    
    return this.convertTimestamps({ id: snap.id, ...data });
  }

  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to update folders');

    const folderDocRef = doc(this.firestore, `folders/${folderId}`);
    const snap = await runInInjectionContext(this.envInjector, () => getDoc(folderDocRef));
    
    if (!snap.exists() || snap.data()['userId'] !== userId) {
      throw new Error('Folder not found or access denied');
    }

    const updateData: any = { 
      ...updates, 
      updatedAt: Timestamp.now(),
    };
    
    delete updateData['id'];
    delete updateData['userId'];
    delete updateData['createdAt'];

    await runInInjectionContext(this.envInjector, () => 
      updateDoc(folderDocRef, updateData)
    );
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    await this.updateFolder(folderId, { name: newName });
  }

  async deleteFolder(folderId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('User must be authenticated to delete folders');

    const subfolders = this.foldersSubject.value.filter(f => f.parentId === folderId);
    
    for (const subfolder of subfolders) {
      await this.deleteFolder(subfolder.id);
    }

    const folderDocRef = doc(this.firestore, `folders/${folderId}`);
    const snap = await runInInjectionContext(this.envInjector, () => getDoc(folderDocRef));
    
    if (!snap.exists() || snap.data()['userId'] !== userId) {
      throw new Error('Folder not found or access denied');
    }

    await runInInjectionContext(this.envInjector, () => deleteDoc(folderDocRef));
  }

  async moveFolder(folderId: string, newParentId: string | null): Promise<void> {
    if (folderId === newParentId) {
      throw new Error('Cannot move folder into itself');
    }
    
    if (newParentId && this.isDescendant(folderId, newParentId)) {
      throw new Error('Cannot move folder into its own descendant');
    }

    await this.updateFolder(folderId, { parentId: newParentId });
  }

  private isDescendant(ancestorId: string, descendantId: string): boolean {
    const folders = this.foldersSubject.value;
    let current = folders.find(f => f.id === descendantId);
    
    while (current) {
      if (current.parentId === ancestorId) return true;
      current = folders.find(f => f.id === current!.parentId!);
    }
    
    return false;
  }

  getFolderPath(folderId: string): Folder[] {
    const folders = this.foldersSubject.value;
    const path: Folder[] = [];
    let current = folders.find(f => f.id === folderId);
    
    while (current) {
      path.unshift(current);
      current = folders.find(f => f.id === current!.parentId!);
    }
    
    return path;
  }

  ngOnDestroy() {
    this.foldersListener?.();
  }
}
