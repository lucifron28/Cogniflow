import { Routes } from '@angular/router';
import { NotesComponent } from './features/notes/notes.component';
import { NoteEditorComponent } from './features/notes/note-editor/note-editor.component';
import { AnalyticsComponent } from './features/analytics/analytics.component';
import { AuthComponent } from './features/auth/auth.component';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/notes', pathMatch: 'full' },
  { 
    path: 'auth', 
    component: AuthComponent,
    canActivate: [publicGuard]
  },
  { 
    path: 'notes', 
    component: NotesComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'notes/new', 
    component: NoteEditorComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'notes/:id', 
    component: NoteEditorComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'analytics', 
    component: AnalyticsComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/notes' }
];
