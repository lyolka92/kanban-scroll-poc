import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnScrollBoardComponent } from './column-scroll/column-scroll-board.component';
import { SharedScrollBoardComponent } from './shared-scroll/shared-scroll-board.component';

export type ScrollApproach = 'column' | 'shared';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    ColumnScrollBoardComponent,
    SharedScrollBoardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board-shell">
      <header class="board-shell__header">
        <h1 class="board-shell__title">🐱 Cat & Dog Board 🐶</h1>
        <div class="approach-toggle">
          <span class="approach-toggle__label">Scroll approach:</span>
          <div class="approach-toggle__buttons">
            <button
              class="approach-toggle__btn"
              [class.approach-toggle__btn--active]="approach() === 'column'"
              (click)="setApproach('column')"
            >
              A — Per-column scroll
              <span class="approach-toggle__hint">(CDK virtual scroll)</span>
            </button>
            <button
              class="approach-toggle__btn"
              [class.approach-toggle__btn--active]="approach() === 'shared'"
              (click)="setApproach('shared')"
            >
              B — Shared scroll
              <span class="approach-toggle__hint"
                >(IntersectionObserver batch)</span
              >
            </button>
          </div>
          <div class="approach-toggle__desc">
            @if (approach() === 'column') {
              <strong>Approach A:</strong> Each column has its own scroll + CDK
              virtual scroll viewport. Cards load independently per column when
              user scrolls near the bottom.
            } @else {
              <strong>Approach B:</strong> Fixed columns with CDK virtual
              scroll. Wheel events sync-scroll all columns. Only columns near
              the bottom trigger a selective batch load.
            }
          </div>
        </div>
      </header>

      <main class="board-shell__content">
        @if (approach() === 'column') {
          <app-column-scroll-board />
        } @else {
          <app-shared-scroll-board />
        }
      </main>
    </div>
  `,
})
export class BoardComponent {
  approach = signal<ScrollApproach>('column');

  setApproach(value: ScrollApproach): void {
    this.approach.set(value);
  }
}
