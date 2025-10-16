import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  isCollapsed = signal(false);
  sidebarWidth = signal(280); // Default width in pixels
  isResizing = signal(false);

  // Collapsible sections state
  showFiles = signal(true);
  showRecent = signal(true);
  showTags = signal(true);
  showTasks = signal(false);

  toggleSidebar() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  toggleSection(section: 'files' | 'recent' | 'tags' | 'tasks') {
    switch (section) {
      case 'files':
        this.showFiles.set(!this.showFiles());
        break;
      case 'recent':
        this.showRecent.set(!this.showRecent());
        break;
      case 'tags':
        this.showTags.set(!this.showTags());
        break;
      case 'tasks':
        this.showTasks.set(!this.showTasks());
        break;
    }
  }

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isResizing.set(true);
    
    const startX = event.clientX;
    const startWidth = this.sidebarWidth();

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(500, startWidth + diff)); // Min 200px, Max 500px
      this.sidebarWidth.set(newWidth);
      
      // Emit resize event for parent component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sidebar-resize', { 
          detail: { width: newWidth } 
        }));
      }
    };

    const onMouseUp = () => {
      this.isResizing.set(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  openSearchModal() {
    // Dispatch custom event to open search modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-search-modal'));
    }
  }
}
