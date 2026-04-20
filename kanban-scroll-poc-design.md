# Kanban Scroll POC - Design Document

**Date:** 2026-04-19
**Author:** Claude
**Status:** Draft

## Overview

POC приложения на Angular 17+ для сравнения двух подходов к загрузке данных в Kanban-доске:
- **Подход 1**: Отдельный скролл в каждой колонке
- **Подход 2**: Общий скролл для всех колонок

Оба подхода используют CDK Virtual Scroller и пакетную загрузку с размером пачки на основе высоты карточки.

---

## 1. Architecture

### Component Structure

```
app/
├── core/
│   ├── services/
│   │   ├── data.service.ts           # Common interface
│   │   ├── separate-scroll.service.ts # Approach 1 implementation
│   │   └── shared-scroll.service.ts   # Approach 2 implementation
│   ├── models/
│   │   ├── animal.model.ts           # Common interfaces
│   │   └── scroll-approach.enum.ts   # Enum for switcher
│   └── data/
│       └── mock-data.json            # Static JSON with data
├── shared/
│   ├── components/
│   │   ├── kanban-board/
│   │   │   ├── kanban-board.component.ts
│   │   │   ├── kanban-board.component.html
│   │   │   └── kanban-board.component.scss
│   │   ├── kanban-column/
│   │   │   ├── kanban-column.component.ts
│   │   │   ├── kanban-column.component.html
│   │   │   └── kanban-column.component.scss
│   │   └── animal-card/
│   │       ├── animal-card.component.ts
│   │       ├── animal-card.component.html
│   │       └── animal-card.component.scss
│   └── pipes/
│       └── animal-type.pipe.ts       # Filter by animal type
└── features/
    └── home/
        ├── home.component.ts
        ├── home.component.html
        └── home.component.scss
```

### Principles

- Single responsibility: each component does one thing
- Explicit interfaces: services implement common interface
- Isolation: approaches don't depend on each other
- Testability: all components and services are testable

---

## 2. Data Models

```typescript
// animal.model.ts
export enum AnimalType {
  CAT = 'cat',
  DOG = 'dog'
}

export enum AnimalStatus {
  STATUS_1 = 'status_1',
  STATUS_2 = 'status_2',
  STATUS_3 = 'status_3'
}

export interface Animal {
  id: string;
  type: AnimalType;
  status: AnimalStatus;
  name: string;           // pet name
  ownerName: string;      // owner name
  photoUrl?: string;      // only for statuses 2 and 3
  age?: number;           // only for statuses 2 and 3
  color?: string;         // only for statuses 2 and 3
  breed?: string;         // only for status 3
  weight?: number;        // only for status 3
}

export interface Column {
  type: AnimalType;
  status: AnimalStatus;
  title: string;
  animals: Animal[];
  hasMore: boolean;
  loading: boolean;
}

export interface ScrollApproachConfig {
  approach: ScrollApproach;
  batchSize: number;
  delay: number;          // delay for network simulation
}

export enum ScrollApproach {
  SEPARATE = 'separate',
  SHARED = 'shared'
}

export interface LoadResponse {
  animals: Animal[];
  hasMore: boolean;
  totalLoaded: number;
}
```

---

## 3. Mock Data Structure

**mock-data.json** — contains ~300 animals (150 cats, 150 dogs), distributed by status:

```json
{
  "cats": {
    "status_1": [...50 items],
    "status_2": [...50 items],
    "status_3": [...50 items]
  },
  "dogs": {
    "status_1": [...50 items],
    "status_2": [...50 items],
    "status_3": [...50 items]
  }
}
```

**Attribute composition by status:**
- **Status 1**: name + ownerName (no photo) — shortest cards
- **Status 2**: photo + (name + ownerName) + age + color — medium height
- **Status 3**: all from status 2 + breed + weight — tallest cards

**Batch sizes by status:**
- Status 1 (short cards): 30 items per batch
- Status 2 (medium): 20 items per batch
- Status 3 (tall): 10 items per batch

**Images from placeholder services:**
- Cats: `https://loremflickr.com/400/300/cat`
- Dogs: `https://loremflickr.com/400/300/dog`
- Fallback: use `https://picsum.photos/400/300?random={id}` if needed

---

## 4. Services

### Common Interface

```typescript
export interface IDataService {
  loadInitialData(type: AnimalType, status: AnimalStatus): Observable<LoadResponse>;
  loadMore(type: AnimalType, status: AnimalStatus, offset: number): Observable<LoadResponse>;
  getBatchSize(status: AnimalStatus): number;
}
```

### SeparateScrollService (Approach 1)

**Logic:**
- Initial load: gets `batchSize` cards for specific column
- Load more: called when user scrolls specific column
- Each column independently tracks its `offset` and `hasMore`

**Methods:**
- `loadInitialData(type, status)` — loads first batch
- `loadMore(type, status, offset)` — loads next batch
- `getBatchSize(status)` — returns batch size for status

### SharedScrollService (Approach 2)

**Logic:**
- Initial load: gets `batchSize` cards for ALL columns in parallel
- Load more: called when user scrolls main container, loads data for ALL columns where `hasMore = true`
- Uses `forkJoin` for parallel loading

**Methods:**
- `loadInitialDataAll()` — loads first batches for all columns
- `loadMoreAll(columns)` — loads next batches for all columns where `hasMore`
- `getBatchSize(status)` — returns batch size for status

### Both Services

- Read from `mock-data.json` via `HttpClient`
- Simulate network delay via `delay()` operator (500-1000ms)
- Return `LoadResponse` with `hasMore` flag
- Implement proper error handling with retry logic
- Use RxJS for data streams

---

## 5. Components

### KanbanBoardComponent

**Responsibility:**
- Displays board with 6 columns (3 cats + 3 dogs)
- Manages switching between approaches
- Coordinates data loading between columns

**Inputs:**
- `approach: ScrollApproach` — current approach

**Outputs:**
- `approachChange: EventEmitter<ScrollApproach>` — approach change

**Logic:**
- Injects appropriate service via factory
- Manages column state (for Shared approach)
- Passes data to KanbanColumn components

### KanbanColumnComponent

**Responsibility:**
- Displays single column with header and cards
- Manages virtual scroll via CDK
- Handles load more event

**Inputs:**
- `column: Column` — column data
- `approach: ScrollApproach` — current approach (for scroll logic)
- `onLoadMore: EventEmitter<void>` — for Separate approach

**Logic:**
- Uses `CdkVirtualScroller` for virtualization
- Detects scroll end for load more trigger
- Shows spinner during loading
- For Shared approach — scroll controlled by parent

### AnimalCardComponent

**Responsibility:**
- Displays animal card based on status

**Inputs:**
- `animal: Animal`
- `status: AnimalStatus`

**Logic:**
- Conditionally renders attributes based on status
- Status 1: only name + ownerName
- Status 2: + photo, age, color
- Status 3: + breed, weight
- Uses `MatCard` from Angular Material

---

## 6. Data Flow

### Separate Scroll Approach

```
User scrolls column
    ↓
KanbanColumn detects scroll end
    ↓
Emits onLoadMore event
    ↓
KanbanBoard calls SeparateScrollService.loadMore(type, status, offset)
    ↓
Service reads from mock-data.json
    ↓
Returns new animals with hasMore flag
    ↓
Column updates: animals += new, hasMore = response.hasMore
```

### Shared Scroll Approach

```
User scrolls main container
    ↓
KanbanBoard detects scroll end
    ↓
Calls SharedScrollService.loadMoreAll(columns)
    ↓
Service forks requests for all columns where hasMore=true
    ↓
Returns array of responses
    ↓
Board updates all columns simultaneously
```

---

## 7. Error Handling

- **Network errors**: retry 3 times with exponential backoff
- **Timeout**: show error to user with "Retry" button
- **Empty data**: show "No data" message
- **Loading states**: spinners at column or board level

---

## 8. Performance Considerations

- **Virtualization**: CDK Virtual Scroller renders only visible elements
- **OnPush change detection**: all components use `ChangeDetectionStrategy.OnPush`
- **Immutable updates**: data updated via immutable patterns
- **TrackBy functions**: for optimized list rendering
- **Bundle size**: tree-shakeable Material imports
- **Signals**: use Angular Signals where possible instead of RxJS

---

## 9. Approach Switcher

**Home Component** contains:
- MatButtonToggleGroup for switching between `SEPARATE` and `SHARED`
- On switch:
  - Clears current data
  - Switches service via factory
  - Reloads initial data
- Saves choice to `localStorage` for persistence

---

## 10. UI Design

**Layout:**
- Header: title + approach switcher
- Board: flex/grid container with 6 columns
- Column: header + virtual scroller + cards
- Card: Material Card with conditionally rendered content

**Styling:**
- Angular Material Theming
- Responsive design (mobile: 1 column, tablet: 2-3, desktop: 6)
- Hover effects on cards
- Smooth transitions for loading states

**Column Titles:**
- Cats Status 1, Cats Status 2, Cats Status 3
- Dogs Status 1, Dogs Status 2, Dogs Status 3

---

## 11. Testing

### Unit Tests

**Services:**
- Test data loading (initial and loadMore)
- Verify `hasMore` calculation
- Test error handling and retry logic
- Mock `HttpClient` with `HttpClientTestingModule`

**Components:**
- KanbanBoard: test approach switching, load coordination
- KanbanColumn: test virtual scroll, load triggers
- AnimalCard: test conditional rendering by status
- Use `ComponentTestingModule` with mocked services

### Integration Tests

- Test data flow from component to service
- Verify approach switching works
- Test error scenarios

### Performance Tests

- Measure load time for each approach
- Measure memory usage during scroll
- Compare FPS during scroll (with/without virtualization)

---

## 12. Implementation Order

1. **Phase 1: Setup**
   - Create Angular project with Angular Material and CDK
   - Set up folder structure
   - Create mock data

2. **Phase 2: Data Layer**
   - Create models and interfaces
   - Implement IDataService interface
   - Create SeparateScrollService
   - Write unit tests for services

3. **Phase 3: Components (Separate Approach)**
   - AnimalCard component
   - KanbanColumn component with CDK Virtual Scroller
   - KanbanBoard component
   - Integration with SeparateScrollService

4. **Phase 4: Components (Shared Approach)**
   - Create SharedScrollService
   - Adapt KanbanBoard for shared approach
   - Set up shared scroll container

5. **Phase 5: Polish**
   - Add approach switcher
   - Styling and Material Theming
   - Error handling and loading states
   - Optimizations (OnPush, trackBy, etc)

6. **Phase 6: Testing & Documentation**
   - Unit tests
   - Integration tests
   - README with instructions

---

## 13. Success Criteria

POC is successful if:

1. **Functionality:**
   - ✅ Both approaches work correctly
   - ✅ Switching between approaches works without bugs
   - ✅ Data loading works smoothly
   - ✅ Error handling works correctly

2. **Performance:**
   - ✅ Smooth scrolling (60 FPS) for both approaches
   - ✅ No memory leaks during extended use
   - ✅ Initial load time acceptable (< 2 seconds)

3. **UX:**
   - ✅ UX difference between approaches is visible
   - ✅ Clear which approach is better for users
   - ✅ Loading states are informative

4. **Code Quality:**
   - ✅ Clean architecture with separation of concerns
   - ✅ Components and services are testable
   - ✅ Code is readable and maintainable

5. **Comparative Analysis:**
   - ✅ Can measure and compare metrics of both approaches
   - ✅ Clear implementation complexity of each approach
   - ✅ Have recommendations for approach selection

---

## 14. Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|-----------|
| CDK Virtual Scroller doesn't work well with Material components | Medium | High | Early POC with CDK, fallback to custom virtualization |
| Complexity with shared scroll for Shared approach | High | Medium | Simplify logic, consider using RxJS `combineLatest` |
| Performance issues with large number of cards | Low | Medium | Virtualization should solve, tune batch sizes |
| Issues with placeholder image services (rate limits, broken URLs) | Medium | Low | Fallback to alternative services, local placeholders if needed |

---

## 15. Technology Stack

- **Framework**: Angular 17+ (Standalone Components)
- **UI Library**: Angular Material
- **Virtualization**: CDK Virtual Scroller
- **HTTP**: HttpClient with mock data
- **Reactive**: RxJS + Angular Signals
- **Styling**: SCSS with Material Theming
- **Testing**: Jasmine + Karma (or Jest)
- **Build**: Angular CLI / esbuild

---

## 16. Constraints & Simplifications

- Small dataset: up to 100 cards per column
- Only 2 entity types (cats, dogs)
- Only 3 statuses per entity
- View-only (no drag-and-drop)
- Static mock data (no real backend)
- Images from placeholder services (loremflickr, picsum)
- POC scope — not production-ready code

---

## 17. Next Steps

1. Review and approve this design document
2. Invoke `writing-plans` skill to create detailed implementation plan
3. Execute implementation plan
4. Test and compare both approaches
5. Document findings and recommendations
