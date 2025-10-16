import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent {}
