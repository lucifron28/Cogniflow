import { Injectable, signal } from '@angular/core';

export type Theme = 'cyber-glow' | 'electric-sky';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>('cyber-glow');

  constructor() {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.theme.set(savedTheme);
      this.applyTheme(savedTheme);
    } else {
      this.applyTheme('cyber-glow');
    }
  }

  toggleTheme() {
    const newTheme: Theme = this.theme() === 'cyber-glow' ? 'electric-sky' : 'cyber-glow';
    this.theme.set(newTheme);
    this.applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }

  private applyTheme(theme: Theme) {
    const root = document.documentElement;
    root.classList.remove('cyber-glow', 'electric-sky');
    root.classList.add(theme);
  }

  isDarkMode(): boolean {
    return this.theme() === 'cyber-glow';
  }
}
