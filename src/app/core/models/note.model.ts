export interface Note {
  id?: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  linkedNotes: string[];
  folderId?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteMetadata {
  id: string;
  title: string;
  tags: string[];
  wordCount: number;
  linkedNotesCount: number;
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface NoteFilter {
  tags?: string[];
  searchQuery?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  folderId?: string | null;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
