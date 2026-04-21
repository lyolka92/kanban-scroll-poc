import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Animal,
  ColumnCursor,
  PageResult,
  CARD_HEIGHT_ESTIMATE,
} from '../models/board.models';
import { DataStore } from './data.store';

export type BoardPageResult = Map<string, PageResult<Animal>>;

@Injectable({ providedIn: 'root' })
export class SharedScrollService {
  constructor(private store: DataStore) {}

  /**
   * Simulates a single batch API call that loads the next page
   * for all columns that still have more data (hasMore=true).
   * Returns a Map keyed by columnId.
   */
  getBoardPage(cursors: ColumnCursor[]): Observable<BoardPageResult> {
    const result: BoardPageResult = new Map();

    for (const cursor of cursors) {
      if (!cursor.hasMore) continue;

      const nextPage = cursor.page + 1;
      const { items, total } = this.store.getPage(
        cursor.entityType,
        cursor.status,
        nextPage,
        cursor.pageSize,
      );
      result.set(cursor.columnId, {
        items,
        total,
        page: nextPage,
        pageSize: cursor.pageSize,
        hasMore: (nextPage + 1) * cursor.pageSize < total,
      });
    }

    const columnIds = Array.from(result.keys()).join(', ');
    console.log(`[SharedScroll] Batch load for columns: [${columnIds}]`);
    return of(result).pipe(delay(2000));
  }

  /**
   * Initial load: fills viewport height for each column.
   * Uses per-status card height estimates so small-card columns (kittens, puppies)
   * load more items, while large-card columns load fewer.
   */
  getInitialBoardPage(
    cursors: Pick<ColumnCursor, 'columnId' | 'entityType' | 'status'>[],
    viewportHeight: number,
  ): Observable<BoardPageResult> {
    const result: BoardPageResult = new Map();
    const IO_PRELOAD_PX = 200; // must match rootMargin in the board component
    const CARD_GAP_PX = 8; // gap between cards in col__list

    for (const cursor of cursors) {
      const cardHeight = CARD_HEIGHT_ESTIMATE[cursor.status] + CARD_GAP_PX;
      const pageSize =
        Math.ceil((viewportHeight + IO_PRELOAD_PX) / cardHeight) + 1;

      const { items, total } = this.store.getPage(
        cursor.entityType,
        cursor.status,
        0,
        pageSize,
      );
      result.set(cursor.columnId, {
        items,
        total,
        page: 0,
        pageSize,
        hasMore: pageSize < total,
      });
    }

    console.log(
      `[SharedScroll] Initial batch load for ${cursors.length} columns`,
    );
    return of(result).pipe(delay(400));
  }
}
