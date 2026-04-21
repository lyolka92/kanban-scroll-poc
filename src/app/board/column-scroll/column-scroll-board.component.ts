import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { COLUMN_CONFIGS, ColumnConfig } from '../../models/board.models';
import { ColumnScrollColumnComponent } from './column-scroll-column.component';

@Component({
  selector: 'app-column-scroll-board',
  standalone: true,
  imports: [CommonModule, ColumnScrollColumnComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board board--column-scroll">
      @for (col of columns; track col.id) {
        <app-column-scroll-column [config]="col" />
      }
    </div>
  `,
})
export class ColumnScrollBoardComponent {
  readonly columns: ColumnConfig[] = COLUMN_CONFIGS;
}
