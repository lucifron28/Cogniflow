import { Component, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { SearchModalComponent } from './shared/components/search-modal/search-modal.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, SidebarComponent, SearchModalComponent],
  standalone: true,
  templateUrl: './app.component.html'
})
export class App {
  authService = inject(AuthService);
  router = inject(Router);
  
  currentRoute = signal<string>('');
  sidebarWidth = signal(280);
  
  showSidebar = computed(() => 
    !this.currentRoute().includes('/auth')
  );
  
  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute.set(event.url);
      });
    
    if (typeof window !== 'undefined') {
      window.addEventListener('sidebar-resize', ((event: CustomEvent) => {
        this.sidebarWidth.set(event.detail.width);
      }) as EventListener);
    }
  }
}
