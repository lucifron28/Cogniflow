import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type AuthMode = 'login' | 'signup';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html'
})
export class AuthComponent {
  mode = signal<AuthMode>('login');
  email = '';
  password = '';
  confirmPassword = '';
  displayName = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
    this.errorMessage = '';
  }

  async onSubmit() {
    this.loading = true;
    this.errorMessage = '';

    try {
      if (this.mode() === 'login') {
        await this.authService.login(this.email, this.password);
      } else {
        if (this.password !== this.confirmPassword) {
          this.errorMessage = 'Passwords do not match';
          this.loading = false;
          return;
        }
        await this.authService.signup(this.email, this.password, this.displayName);
      }
      
      this.router.navigate(['/notes']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Authentication failed';
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle() {
    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/notes']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Google login failed';
    } finally {
      this.loading = false;
    }
  }
}
