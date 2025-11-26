import { Component, inject, signal, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './theme-toggle.component.html',
  styles: [`
    :host {
      position: relative;
      display: block;
    }
  `]
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
  elementRef = inject(ElementRef);
  cdr = inject(ChangeDetectorRef);
  isDropdownOpen = signal(false);

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen.update(val => !val);
  }

  selectTheme(theme: Theme, event: Event) {
    event.stopPropagation();
    this.themeService.setTheme(theme);
    this.isDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const button = this.elementRef.nativeElement.querySelector('button');
    const clickedButton = button && button.contains(event.target);
    
    if (!clickedButton) {
      const clickedInside = this.elementRef.nativeElement.contains(event.target);
      if (!clickedInside && this.isDropdownOpen()) {
        this.isDropdownOpen.set(false);
      }
    }
  }
}
