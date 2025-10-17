import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { FolderService } from '../../../services/folder.service';
import { NotesService } from '../../../services/notes.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Folder } from '../../../core/models/note.model';
import { Note } from '../../../core/models/note.model';
import { IconComponent } from '../icon/icon.component';

interface TreeNode {
  type: 'folder' | 'note';
  id: string;
  name: string;
  parentId: string | null;
  children?: TreeNode[];
  expanded?: boolean;
  data?: Folder | Note;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  node: TreeNode | null;
}

@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, IconComponent],
  templateUrl: './file-tree.component.html',
  styleUrl: './file-tree.component.css'
})
export class FileTreeComponent implements OnInit {
  folderService = inject(FolderService);
  notesService = inject(NotesService);
  themeService = inject(ThemeService);
  router = inject(Router);

  folders = signal<Folder[]>([]);
  notes = signal<Note[]>([]);
  
  // Track which folders are expanded
  expandedFolders = signal<Set<string>>(new Set());
  
  // Context menu
  contextMenu = signal<ContextMenuState>({ show: false, x: 0, y: 0, node: null });
  
  // Toast notification
  toastMessage = signal<string | null>(null);
  
  // Modals
  showCreateFolderModal = signal(false);
  showRenameModal = signal(false);
  newFolderName = signal('');
  newFolderParent = signal<string | null>(null);
  renameTarget = signal<TreeNode | null>(null);
  renameValue = signal('');

  // Tree structure
  tree = computed(() => this.buildTree());

  // All drop list IDs for connecting lists
  allDropListIds = computed(() => {
    const ids: string[] = ['root-drop-list'];
    const collectFolderIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          ids.push('drop-' + node.id);
          if (node.children) {
            collectFolderIds(node.children);
          }
        }
      }
    };
    collectFolderIds(this.tree());
    return ids;
  });

  constructor() {
    // Close context menu on click outside
    if (typeof window !== 'undefined') {
      window.addEventListener('click', () => {
        if (this.contextMenu().show) {
          this.contextMenu.set({ show: false, x: 0, y: 0, node: null });
        }
      });
    }
  }

  ngOnInit() {
    // Subscribe to folders
    this.folderService.getFolders().subscribe(folders => {
      this.folders.set(folders);
    });

    // Subscribe to notes
    this.notesService.getNotes().subscribe(notes => {
      this.notes.set(notes);
    });
  }

  // Build tree structure
  private buildTree(): TreeNode[] {
    const folders = this.folders();
    const notes = this.notes();
    const tree: TreeNode[] = [];

    // Helper function to build folder tree recursively
    const buildFolderTree = (parentId: string | null): TreeNode[] => {
      const childFolders = folders
        .filter(f => f.parentId === parentId)
        .map(f => ({
          type: 'folder' as const,
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          expanded: this.expandedFolders().has(f.id), // Use tracked expansion state
          children: buildFolderTree(f.id),
          data: f,
        }));

      // Add notes in this folder
      // For root level (parentId === null), include notes with folderId === null or undefined
      const folderNotes = notes
        .filter(n => {
          if (parentId === null) {
            return !n.folderId; // Include notes where folderId is null or undefined
          }
          return n.folderId === parentId;
        })
        .map(n => ({
          type: 'note' as const,
          id: n.id!,
          name: n.title,
          parentId: n.folderId || null,
          data: n,
        }));

      return [...childFolders, ...folderNotes];
    };

    return buildFolderTree(null);
  }

  // Toggle folder expansion
  toggleFolder(node: TreeNode) {
    if (node.type === 'folder') {
      const expanded = this.expandedFolders();
      if (expanded.has(node.id)) {
        expanded.delete(node.id);
      } else {
        expanded.add(node.id);
      }
      // Trigger change detection
      this.expandedFolders.set(new Set(expanded));
    }
  }
  
  // Navigate to folder view
  openFolder(folderId: string) {
    this.router.navigate(['/notes/folder', folderId]);
  }

  // Navigate to note
  openNote(noteId: string) {
    this.router.navigate(['/notes', noteId]);
  }

  // Context menu
  showContextMenu(event: MouseEvent, node: TreeNode) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({
      show: true,
      x: event.clientX,
      y: event.clientY,
      node,
    });
  }

  closeContextMenu() {
    this.contextMenu.set({ show: false, x: 0, y: 0, node: null });
  }

  // Folder operations
  openCreateFolderModal(parentId: string | null = null) {
    this.newFolderParent.set(parentId);
    this.newFolderName.set('');
    this.showCreateFolderModal.set(true);
    this.closeContextMenu();
  }

  async createFolder() {
    const name = this.newFolderName().trim();
    if (!name) return;

    try {
      await this.folderService.createFolder(name, this.newFolderParent());
      this.showCreateFolderModal.set(false);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  }

  openRenameModal(node: TreeNode) {
    this.renameTarget.set(node);
    this.renameValue.set(node.name);
    this.showRenameModal.set(true);
    this.closeContextMenu();
  }

  async rename() {
    const target = this.renameTarget();
    if (!target) return;

    const newName = this.renameValue().trim();
    if (!newName) return;

    try {
      if (target.type === 'folder') {
        await this.folderService.renameFolder(target.id, newName);
      } else {
        await this.notesService.updateNote(target.id, { title: newName });
      }
      this.showRenameModal.set(false);
    } catch (error) {
      console.error('Error renaming:', error);
    }
  }

  async deleteItem(node: TreeNode) {
    const confirmMsg = node.type === 'folder' 
      ? `Delete folder "${node.name}" and all its contents?`
      : `Delete note "${node.name}"?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      if (node.type === 'folder') {
        // Delete all notes in this folder first
        const notesInFolder = this.notes().filter(n => n.folderId === node.id);
        for (const note of notesInFolder) {
          await this.notesService.deleteNote(note.id!);
        }
        await this.folderService.deleteFolder(node.id);
      } else {
        await this.notesService.deleteNote(node.id);
      }
      this.closeContextMenu();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  async createNoteInFolder(folderId: string | null) {
    try {
      const noteId = await this.notesService.createNote({
        title: 'New Note',
        content: '',
        tags: [],
        isPinned: false,
        isFavorite: false,
        linkedNotes: [],
        folderId,
      });
      this.router.navigate(['/notes', noteId]);
      this.closeContextMenu();
    } catch (error) {
      console.error('Error creating note:', error);
    }
  }

  // Drag and drop
  async onDrop(event: CdkDragDrop<TreeNode[]>, targetFolder: TreeNode | null) {
    const draggedNode = event.item.data as TreeNode;
    const newParentId = targetFolder?.id || null;

    // Check if we're moving within the same container
    if (event.previousContainer === event.container) {
      // Just reordering within the same folder - no need to update Firestore
      return;
    }

    // Moving between containers - update Firestore
    try {
      if (draggedNode.type === 'folder') {
        await this.folderService.moveFolder(draggedNode.id, newParentId);
      } else {
        await this.notesService.updateNote(draggedNode.id, { folderId: newParentId });
      }
      
      // Don't manually update arrays - let Firestore listeners handle it
      // The tree will automatically rebuild when notes/folders signals update
    } catch (error) {
      console.error('Error moving item:', error);
      alert(error instanceof Error ? error.message : 'Error moving item');
    }
  }

  /* Commented out: Auto-move on enter was causing double moves
  // Optional: Auto-move on enter (move on touch behavior)
  async onDropListEntered(event: CdkDragEnter<TreeNode[]>, targetFolder: TreeNode) {
    const draggedNode = (event.item as any).data as TreeNode;
    const fromArray = (event.item as any).dropContainer.data as TreeNode[];
    const toArray = event.container.data as TreeNode[];
    
    // Don't move if already in the target folder
    if (fromArray === toArray) return;
    
    // Only allow notes to be moved this way (not folders)
    if (draggedNode.type !== 'note') return;

    const idx = fromArray.findIndex(n => n.id === draggedNode.id);
    if (idx === -1) return;

    try {
      // Update Firestore
      await this.notesService.updateNote(draggedNode.id, { folderId: targetFolder.id });
      
      // Update local arrays
      toArray.push(draggedNode);
      fromArray.splice(idx, 1);
      
      // Trigger change detection
      this.notes.set([...this.notes()]);
    } catch (error) {
      console.error('Error auto-moving note:', error);
    }
  }
  */

  // Context menu actions
  contextAction(action: string) {
    const node = this.contextMenu().node;
    if (!node) return;

    switch (action) {
      case 'rename':
        this.openRenameModal(node);
        break;
      case 'delete':
        this.deleteItem(node);
        break;
      case 'new-folder':
        if (node.type === 'folder') {
          this.openCreateFolderModal(node.id);
        }
        break;
      case 'new-note':
        if (node.type === 'folder') {
          this.createNoteInFolder(node.id);
        }
        break;
      case 'move-out':
        if (node.type === 'note') {
          this.notesService.updateNote(node.id, { folderId: null });
        }
        break;
      case 'copy-link':
        if (node.type === 'note') {
          this.copyNoteLink(node);
        }
        break;
    }
  }

  async copyNoteLink(node: TreeNode) {
    try {
      // Get the full note data
      const note = this.notes().find(n => n.id === node.id);
      if (!note) {
        console.error('Note not found');
        return;
      }

      // Build the path for the note
      const path = await this.notesService.buildNotePath(note, this.folders());
      
      // Create the wiki link syntax with the path
      const linkText = `[[${path}]]`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(linkText);
      
      // Close context menu
      this.closeContextMenu();
      
      // Show toast notification
      this.toastMessage.set(`Link copied: ${linkText}`);
      setTimeout(() => this.toastMessage.set(null), 3000);
      
      console.log('Link copied to clipboard:', linkText);
    } catch (error) {
      console.error('Error copying link:', error);
      this.toastMessage.set('Failed to copy link');
      setTimeout(() => this.toastMessage.set(null), 3000);
    }
  }

  // Helper methods for form bindings
  get newFolderNameValue() {
    return this.newFolderName();
  }

  set newFolderNameValue(value: string) {
    this.newFolderName.set(value);
  }

  get renameValueBinding() {
    return this.renameValue();
  }

  set renameValueBinding(value: string) {
    this.renameValue.set(value);
  }
}
