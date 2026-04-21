export type CatStatus = 'kitten' | 'cat' | 'old-cat';
export type DogStatus = 'puppy' | 'dog' | 'old-dog';
export type AnimalStatus = CatStatus | DogStatus;
export type EntityType = 'cat' | 'dog';

export interface Animal {
  id: number;
  entityType: EntityType;
  status: AnimalStatus;
  name: string;
  imageUrl: string;
  age: number; // months
}

export interface Cat extends Animal {
  entityType: 'cat';
  status: CatStatus;
  // Medium & Large fields (only for cat/old-cat); breed also available for kitten
  breed?: string;
  weight?: number; // kg
  color?: string;
  // Large fields (only for old-cat)
  healthNotes?: string;
  specialNeeds?: string;
}

export interface Dog extends Animal {
  entityType: 'dog';
  status: DogStatus;
  // Medium & Large fields (only for dog/old-dog); breed also available for puppy
  breed?: string;
  weight?: number; // kg
  color?: string;
  // Large fields (only for old-dog)
  healthNotes?: string;
  specialNeeds?: string;
}

export interface ColumnConfig {
  id: string;
  entityType: EntityType;
  status: AnimalStatus;
  label: string;
}

export interface PageResult<T extends Animal = Animal> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ColumnCursor {
  columnId: string;
  entityType: EntityType;
  status: AnimalStatus;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  { id: 'kitten', entityType: 'cat', status: 'kitten', label: 'Kittens' },
  { id: 'cat', entityType: 'cat', status: 'cat', label: 'Cats' },
  { id: 'old-cat', entityType: 'cat', status: 'old-cat', label: 'Old Cats' },
  { id: 'puppy', entityType: 'dog', status: 'puppy', label: 'Puppies' },
  { id: 'dog', entityType: 'dog', status: 'dog', label: 'Dogs' },
  { id: 'old-dog', entityType: 'dog', status: 'old-dog', label: 'Old Dogs' },
];

/**
 * Approximate rendered card height (px) per status.
 * Used to calculate how many cards fit in the viewport on initial load.
 *
 * kitten / puppy  — small card (no image): ~80px
 * cat / dog       — medium card (image + breed/color/weight): ~230px
 * old-cat / old-dog — large card (image + health/needs): ~280px
 */
export const CARD_HEIGHT_ESTIMATE: Record<AnimalStatus, number> = {
  kitten: 80,
  cat: 230,
  'old-cat': 280,
  puppy: 80,
  dog: 230,
  'old-dog': 280,
};
