import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // TODO: Check if user is authenticated
  const isAuthenticated = !!authService.getCurrentUser();

  if (!isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
