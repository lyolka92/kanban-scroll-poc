import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ViewChildren,
  QueryList,
  ElementRef,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import {
  COLUMN_CONFIGS,
  ColumnConfig,
  ColumnCursor,
} from '../../models/board.models';
import { SharedScrollService } from '../../services/shared-scroll.service';
import { SharedScrollColumnComponent } from './shared-scroll-column.component';

const PAGE_SIZE = 8;
const PRELOAD_THRESHOLD_PX = 300;

@Component({
  selector: 'app-shared-scroll-board',
  standalone: true,
  imports: [CommonModule, SharedScrollColumnComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board board--shared-scroll">
      @for (col of columns; track col.id) {
        <app-shared-scroll-column [config]="col" />
      }
      <div class="board__scrollbar" #scrollDriver (scroll)="onDriverScroll()">
        <div [style.height.px]="driverHeight()"></div>
      </div>
    </div>

    @if (loading()) {
      <div class="board__loader">Loading more…</div>
    }
  `,
})
export class SharedScrollBoardComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly columns: ColumnConfig[] = COLUMN_CONFIGS;

  loading = signal(false);
  driverHeight = signal(0);

  @ViewChild('scrollDriver', { static: true })
  scrollDriver!: ElementRef<HTMLElement>;
  @ViewChildren(SharedScrollColumnComponent)
  columnComponents!: QueryList<SharedScrollColumnComponent>;

  private cursors: Map<string, ColumnCursor> = new Map();
  private destroy$ = new Subject<void>();

  constructor(
    private service: SharedScrollService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    for (const col of this.columns) {
      this.cursors.set(col.id, {
        columnId: col.id,
        entityType: col.entityType,
        status: col.status,
        page: -1,
        pageSize: PAGE_SIZE,
        hasMore: true,
      });
    }
  }

  ngAfterViewInit(): void {
    this.loadInitial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Single wheel handler on the host element.
   * Routes deltaY through the scroll driver so all columns stay in sync
   * and the shared scrollbar reflects the current position.
   */
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.scrollDriver.nativeElement.scrollTop += event.deltaY;
  }

  /** Syncs every column viewport to the driver's scrollTop. */
  onDriverScroll(): void {
    const scrollTop = this.scrollDriver.nativeElement.scrollTop;
    this.columnComponents?.forEach((col) => {
      const el = col.viewport?.elementRef.nativeElement;
      if (el) el.scrollTop = scrollTop;
    });
    this.checkAndLoadMore();
  }

  private loadInitial(): void {
    this.loading.set(true);
    const viewportHeight = window.innerHeight;

    const initCursors = this.columns.map((col) => ({
      columnId: col.id,
      entityType: col.entityType,
      status: col.status,
    }));

    this.service
      .getInitialBoardPage(initCursors, viewportHeight)
      .pipe(takeUntil(this.destroy$))
      .subscribe((batchResult) => {
        batchResult.forEach((pageResult, colId) => {
          const colComp = this.getColumnComponent(colId);
          colComp?.appendItems(
            pageResult.items,
            pageResult.total,
            pageResult.hasMore,
          );

          this.cursors.set(colId, {
            columnId: colId,
            entityType: this.columns.find((c) => c.id === colId)!.entityType,
            status: this.columns.find((c) => c.id === colId)!.status,
            page: pageResult.page,
            pageSize: pageResult.pageSize,
            hasMore: pageResult.hasMore,
          });
        });
        this.loading.set(false);
        this.cdr.markForCheck();
        this.updateDriverHeight();
      });
  }

  /**
   * Check which columns are scrolled near the bottom and still have data,
   * then issue a single batch request for only those columns.
   */
  private checkAndLoadMore(): void {
    if (this.loading()) return;

    const needyCursors = this.getColumnsNeedingData();
    if (needyCursors.length === 0) return;

    // Mark needy columns as loading so they show skeletons
    needyCursors.forEach((cursor) => {
      const col = this.getColumnComponent(cursor.columnId);
      col?.loading.set(true);
    });

    this.loading.set(true);

    this.service
      .getBoardPage(needyCursors)
      .pipe(takeUntil(this.destroy$))
      .subscribe((batchResult) => {
        batchResult.forEach((pageResult, colId) => {
          const colComp = this.getColumnComponent(colId);
          colComp?.appendItems(
            pageResult.items,
            pageResult.total,
            pageResult.hasMore,
          );

          const cursor = this.cursors.get(colId)!;
          this.cursors.set(colId, {
            ...cursor,
            page: pageResult.page,
            hasMore: pageResult.hasMore,
          });
        });
        this.loading.set(false);
        this.cdr.markForCheck();
        this.updateDriverHeight();
      });
  }

  /**
   * Returns cursors only for columns whose viewport is scrolled
   * near the bottom AND still have more data to load.
   */
  private getColumnsNeedingData(): ColumnCursor[] {
    return (
      this.columnComponents
        ?.filter((col) => col.needsMore(PRELOAD_THRESHOLD_PX))
        .map((col) => this.cursors.get(col.config.id)!)
        .filter((cursor) => cursor?.hasMore) ?? []
    );
  }

  /**
   * Equalises all viewport scroll heights so that setting a single scrollTop
   * value keeps every column in sync, but limits the scrollable range
   * to the shortest column's content (so you can't scroll past the
   * bottom of the topmost skeleton).
   *
   * 1. Clear previous min-heights to read each viewport's natural scrollHeight.
   * 2. Find the tallest and shortest natural scroll heights.
   * 3. Set min-height on every CDK spacer to the tallest (sync).
   * 4. Set the scroll driver's inner div to the shortest (limit).
   */
  private updateDriverHeight(): void {
    requestAnimationFrame(() => {
      // 1. Reset spacers so we read natural heights
      this.columnComponents?.forEach((col) => {
        const spacer = col.viewport?.elementRef.nativeElement.querySelector(
          '.cdk-virtual-scroll-spacer',
        ) as HTMLElement | null;
        if (spacer) spacer.style.minHeight = '';
      });

      // 2. Find max and min natural scrollHeight.
      //    For columns that still have more data (hasMore), add one itemSize
      //    so the scroll limit includes the skeleton card that will appear.
      let maxScrollHeight = 0;
      let minScrollHeight = Infinity;
      this.columnComponents?.forEach((col) => {
        let h = col.viewport?.elementRef.nativeElement.scrollHeight ?? 0;
        if (col.hasMore()) h += col.itemSize();
        if (h > maxScrollHeight) maxScrollHeight = h;
        if (h < minScrollHeight) minScrollHeight = h;
      });
      if (minScrollHeight === Infinity) minScrollHeight = maxScrollHeight;

      // 3. Set all spacers to the max so every viewport has the same scrollHeight
      this.columnComponents?.forEach((col) => {
        const spacer = col.viewport?.elementRef.nativeElement.querySelector(
          '.cdk-virtual-scroll-spacer',
        ) as HTMLElement | null;
        if (spacer) spacer.style.minHeight = maxScrollHeight + 'px';
      });

      // 4. Driver height = shortest column's content height.
      //    This limits scrolling to the bottom of the topmost skeleton.
      const firstVp =
        this.columnComponents?.first?.viewport?.elementRef.nativeElement;
      const driverEl = this.scrollDriver?.nativeElement;
      if (firstVp && driverEl) {
        const offset = driverEl.clientHeight - firstVp.clientHeight;
        this.driverHeight.set(minScrollHeight + offset);
      } else {
        this.driverHeight.set(minScrollHeight);
      }
      this.cdr.markForCheck();
    });
  }

  private getColumnComponent(
    colId: string,
  ): SharedScrollColumnComponent | undefined {
    return this.columnComponents?.find((c) => c.config.id === colId);
  }
}
