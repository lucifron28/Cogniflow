import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor() {}

  // Firebase Authentication methods will go here
  login(email: string, password: string) {
    // TODO: Implement Firebase login
  }

  logout() {
    // TODO: Implement Firebase logout
  }

  getCurrentUser() {
    // TODO: Get current user from Firebase
    return null;
  }
}
