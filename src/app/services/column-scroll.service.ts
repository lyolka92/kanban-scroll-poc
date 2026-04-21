import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Animal,
  EntityType,
  AnimalStatus,
  PageResult,
} from '../models/board.models';
import { DataStore } from './data.store';

@Injectable({ providedIn: 'root' })
export class ColumnScrollService {
  constructor(private store: DataStore) {}

  /**
   * Simulates a per-column paginated API call.
   * Each column fetches its own pages independently.
   */
  getPage(
    entityType: EntityType,
    status: AnimalStatus,
    page: number,
    pageSize: number,
  ): Observable<PageResult<Animal>> {
    const { items, total } = this.store.getPage(
      entityType,
      status,
      page,
      pageSize,
    );
    const result: PageResult<Animal> = {
      items,
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
    };
    console.log(
      `[ColumnScroll] ${entityType}/${status} page=${page} → ${items.length} items, hasMore=${result.hasMore}`,
    );
    return of(result).pipe(delay(1500));
  }
}
