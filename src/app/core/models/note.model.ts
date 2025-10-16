export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string | null; // null for root level
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  backlinks: string[]; // Array of note IDs that link to this note
  linkedNotes: string[]; // Array of note IDs that this note links to
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null for root level
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
