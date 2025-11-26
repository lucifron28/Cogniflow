import { Injectable, signal } from '@angular/core';
import { IconName } from '../../shared/components/icon/icon.component';

export type Theme = 'cyber-glow' | 'electric-sky' | 'dark' | 'light';

export interface ThemeOption {
  value: Theme;
  label: string;
  icon: IconName;
  isDark: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>('cyber-glow');

  // Available themes for dropdown
  availableThemes: ThemeOption[] = [
    { value: 'cyber-glow', label: 'Cyber Glow', icon: 'moon', isDark: true },
    { value: 'dark', label: 'Dark', icon: 'moon', isDark: true },
    { value: 'light', label: 'Light', icon: 'sun', isDark: false },
    { value: 'electric-sky', label: 'Electric Sky', icon: 'sun', isDark: false },
  ];

  constructor() {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.theme.set(savedTheme);
      this.applyTheme(savedTheme);
    } else {
      this.applyTheme('cyber-glow');
    }
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem('theme', theme);
  }

  toggleTheme() {
    // Legacy toggle - cycles through themes
    const themes: Theme[] = ['cyber-glow', 'dark', 'light', 'electric-sky'];
    const currentIndex = themes.indexOf(this.theme());
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  private applyTheme(theme: Theme) {
    const root = document.documentElement;
    root.classList.remove('cyber-glow', 'electric-sky', 'dark', 'light');
    root.classList.add(theme);
  }

  isDarkMode(): boolean {
    const darkThemes: Theme[] = ['cyber-glow', 'dark'];
    return darkThemes.includes(this.theme());
  }

  getCurrentThemeOption(): ThemeOption {
    return this.availableThemes.find(t => t.value === this.theme()) || this.availableThemes[0];
  }
}
