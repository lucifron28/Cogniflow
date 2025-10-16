import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notes.component.html'
})
export class NotesComponent {
    constructor() {
    }
}
