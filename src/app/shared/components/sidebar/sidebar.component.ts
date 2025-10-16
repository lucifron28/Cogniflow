import { Component, signal, computed, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { IconComponent } from '../icon/icon.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);
  
  isCollapsed = signal(false);
  sidebarWidth = signal(280); // Default width in pixels
  isResizing = signal(false);

  // Collapsible sections state
  showFiles = signal(true);
  showRecent = signal(true);
  showTags = signal(true);
  showTasks = signal(false);
  showSettings = signal(false);

  toggleSidebar() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  toggleSettingsMenu() {
    this.showSettings.set(!this.showSettings());
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

  ngOnInit() {
    // Listen for clicks on document to close settings menu
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.closeSettingsOnClickOutside.bind(this));
    }
  }

  ngOnDestroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.closeSettingsOnClickOutside.bind(this));
    }
  }

  private closeSettingsOnClickOutside(event: MouseEvent) {
    // Close settings menu when clicking outside
    if (this.showSettings()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.sidebar-footer')) {
        this.showSettings.set(false);
      }
    }
  }

  async logout() {
    try {
      this.showSettings.set(false); // Close menu
      await this.authService.logout();
      await this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
