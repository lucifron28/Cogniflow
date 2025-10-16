import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './note-editor.component.html'
})
export class NoteEditorComponent {}
