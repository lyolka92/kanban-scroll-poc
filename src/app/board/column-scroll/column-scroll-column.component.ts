import {
  Component,
  Input,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  Injector,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ScrollingModule,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { Subject, takeUntil } from 'rxjs';
import { Animal, Cat, Dog, ColumnConfig } from '../../models/board.models';
import { ColumnScrollService } from '../../services/column-scroll.service';
import { CatCardComponent } from '../card/cat-card.component';
import { DogCardComponent } from '../card/dog-card.component';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-column-scroll-column',
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
export class ColumnScrollColumnComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input({ required: true }) config!: ColumnConfig;
  @ViewChild('viewport') viewport!: CdkVirtualScrollViewport;

  items = signal<Animal[]>([]);
  total = signal(0);
  loading = signal(false);
  hasMore = signal(true);
  /** Appends a null sentinel when loading — renders as skeleton inside the virtual list. */
  displayItems = computed<(Animal | null)[]>(() =>
    this.loading() ? [...this.items(), null] : this.items(),
  );
  /** Measured from first rendered card; default keeps CDK happy until then. */
  itemSize = signal(120);

  asCat(a: Animal): Cat {
    return a as Cat;
  }
  asDog(a: Animal): Dog {
    return a as Dog;
  }

  private page = 0;
  private measured = false;
  private destroy$ = new Subject<void>();

  constructor(
    private service: ColumnScrollService,
    private injector: Injector,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPage();
  }

  ngAfterViewInit(): void {
    this.viewport
      .elementScrolled()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkScrollEnd());

    // For short columns where content fits without a scrollbar, the user can't
    // scroll so elementScrolled() never fires.  Detect mouse-wheel-down as
    // explicit user intent to load more.
    this.viewport.elementRef.nativeElement.addEventListener(
      'wheel',
      this.onWheel,
      { passive: true },
    );
  }

  ngOnDestroy(): void {
    this.viewport.elementRef.nativeElement.removeEventListener(
      'wheel',
      this.onWheel,
    );
    this.destroy$.next();
    this.destroy$.complete();
  }

  private onWheel = (e: WheelEvent): void => {
    if (e.deltaY <= 0) return; // only care about scroll-down intent
    const el = this.viewport.elementRef.nativeElement;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const atBottom =
      scrollHeight <= clientHeight ||
      scrollTop + clientHeight >= scrollHeight - 2;
    if (atBottom) {
      this.loadPage();
    }
  };

  private checkScrollEnd(): void {
    if (this.loading() || !this.hasMore()) return;
    const el = this.viewport.elementRef.nativeElement;
    const { scrollTop, scrollHeight, clientHeight } = el;

    // Only trigger when the user has scrolled close to the bottom.
    if (scrollHeight <= clientHeight) return;

    const threshold = this.itemSize() * 2;
    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      this.loadPage();
    }
  }

  private loadPage(): void {
    if (this.loading() || !this.hasMore()) return;
    this.loading.set(true);

    this.service
      .getPage(this.config.entityType, this.config.status, this.page, PAGE_SIZE)
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.items.update((prev) => [...prev, ...result.items]);
        this.total.set(result.total);
        this.hasMore.set(result.hasMore);
        this.page++;
        this.loading.set(false);

        // Force synchronous re-render so CDK virtual scroll picks up the new
        // items and recalculates the rendered range immediately.
        this.cdr.detectChanges();

        if (!this.measured) {
          afterNextRender(() => this.measureItemSize(), {
            injector: this.injector,
          });
        }
      });
  }

  trackByItem(_: number, item: Animal | null): number | null {
    return item?.id ?? null;
  }

  /**
   * Queries the first rendered .card element and uses its scrollHeight
   * (full content height, not clipped by the wrapper) as the item size.
   * 8px accounts for the wrapper's bottom padding (col__item-wrapper).
   */
  private measureItemSize(): void {
    const card = this.viewport?.elementRef.nativeElement.querySelector(
      '.card',
    ) as HTMLElement | null;
    if (!card) return;
    this.itemSize.set(card.scrollHeight + 8);
    this.measured = true;
  }
}
