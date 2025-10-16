import { Routes } from '@angular/router';
import { NotesComponent } from './features/notes/notes.component';
import { NoteEditorComponent } from './features/notes/note-editor/note-editor.component';
import { AnalyticsComponent } from './features/analytics/analytics.component';
import { SearchComponent } from './features/search/search.component';
import { AuthComponent } from './features/auth/auth.component';

export const routes: Routes = [
  { path: '', redirectTo: '/auth', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'notes', component: NotesComponent },
  { path: 'notes/new', component: NoteEditorComponent },
  { path: 'notes/:id', component: NoteEditorComponent },
  { path: 'analytics', component: AnalyticsComponent },
  { path: 'search', component: SearchComponent },
  { path: '**', redirectTo: '/auth' }
];
