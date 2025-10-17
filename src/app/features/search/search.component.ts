import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './search.component.html'
})
export class SearchComponent {}
