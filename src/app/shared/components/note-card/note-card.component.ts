import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Note } from '../../../core/models/note.model';

@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-card.component.html'
})
export class NoteCardComponent {
  @Input() note?: Note;
}
