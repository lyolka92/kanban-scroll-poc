import {
  Component,
  Input,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  Injector,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ScrollingModule,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { Animal, Cat, Dog, ColumnConfig } from '../../models/board.models';
import { CatCardComponent } from '../card/cat-card.component';
import { DogCardComponent } from '../card/dog-card.component';

@Component({
  selector: 'app-shared-scroll-column',
  standalone: true,
  imports: [CommonModule, ScrollingModule, CatCardComponent, DogCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="col">
      <div class="col__header">
        <span class="col__label">{{ config.label }}</span>
        <span class="col__count">{{ items().length }} / {{ total() }}</span>
      </div>

      <cdk-virtual-scroll-viewport
        #viewport
        class="col__viewport"
        [itemSize]="itemSize()"
      >
        <div
          *cdkVirtualFor="let item of displayItems(); trackBy: trackByItem"
          class="col__item-wrapper"
        >
          @if (item === null) {
            <div class="card-skeleton" [style.height.px]="itemSize() - 8">
              <div class="card-skeleton__header">
                <div
                  class="card-skeleton__line card-skeleton__line--name"
                ></div>
                <div
                  class="card-skeleton__line card-skeleton__line--badge"
                ></div>
              </div>
              <div class="card-skeleton__line card-skeleton__line--row"></div>
              <div
                class="card-skeleton__line card-skeleton__line--row card-skeleton__line--short"
              ></div>
              <div class="card-skeleton__line card-skeleton__line--row"></div>
            </div>
          } @else if (config.entityType === 'cat') {
            <app-cat-card [cat]="asCat(item)" />
          } @else {
            <app-dog-card [dog]="asDog(item)" />
          }
        </div>
      </cdk-virtual-scroll-viewport>

      @if (!hasMore() && items().length > 0) {
        <div class="col__end">All {{ total() }} loaded</div>
      }
    </div>
  `,
})
export class SharedScrollColumnComponent {
  @Input({ required: true }) config!: ColumnConfig;
  @ViewChild('viewport') viewport!: CdkVirtualScrollViewport;

  items = signal<Animal[]>([]);
  total = signal(0);
  hasMore = signal(true);
  loading = signal(false);

  displayItems = computed<(Animal | null)[]>(() =>
    this.loading() ? [...this.items(), null] : this.items(),
  );

  itemSize = signal(120);
  private measured = false;

  constructor(
    private injector: Injector,
    private cdr: ChangeDetectorRef,
  ) {}

  appendItems(newItems: Animal[], newTotal: number, newHasMore: boolean): void {
    this.items.update((prev) => [...prev, ...newItems]);
    this.total.set(newTotal);
    this.hasMore.set(newHasMore);
    this.loading.set(false);
    this.cdr.detectChanges();

    if (!this.measured) {
      afterNextRender(() => this.measureItemSize(), {
        injector: this.injector,
      });
    }
  }

  /** Check if this column's viewport is scrolled near the bottom of its real content. */
  needsMore(threshold: number): boolean {
    if (!this.hasMore() || this.loading() || !this.viewport) return false;
    const el = this.viewport.elementRef.nativeElement;
    // Natural content height (not inflated by spacer sync)
    const contentHeight = this.items().length * this.itemSize();
    const bottomOffset = contentHeight - el.clientHeight - el.scrollTop;
    return bottomOffset < threshold;
  }

  asCat(a: Animal): Cat {
    return a as Cat;
  }
  asDog(a: Animal): Dog {
    return a as Dog;
  }

  trackByItem(_: number, item: Animal | null): number | null {
    return item?.id ?? null;
  }

  private measureItemSize(): void {
    const card = this.viewport?.elementRef.nativeElement.querySelector(
      '.card',
    ) as HTMLElement | null;
    if (!card) return;
    this.itemSize.set(card.scrollHeight + 8);
    this.measured = true;
  }
}
