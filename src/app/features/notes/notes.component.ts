import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './notes.component.html'
})
export class NotesComponent {
    constructor() {
    }
}
