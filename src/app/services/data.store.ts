import { Injectable } from '@angular/core';
import {
  Animal,
  Cat,
  Dog,
  EntityType,
  AnimalStatus,
} from '../models/board.models';
import animalsData from '../data/animals.json';

@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly animals: Animal[] = animalsData as Animal[];

  getByColumn(entityType: EntityType, status: AnimalStatus): Animal[] {
    return this.animals.filter(
      (a) => a.entityType === entityType && a.status === status,
    );
  }

  getPage(
    entityType: EntityType,
    status: AnimalStatus,
    page: number,
    pageSize: number,
  ): { items: Animal[]; total: number } {
    const all = this.getByColumn(entityType, status);
    const start = page * pageSize;
    const items = all.slice(start, start + pageSize);
    return { items, total: all.length };
  }

  getCats(status: AnimalStatus): Cat[] {
    return this.getByColumn('cat', status) as Cat[];
  }

  getDogs(status: AnimalStatus): Dog[] {
    return this.getByColumn('dog', status) as Dog[];
  }
}
