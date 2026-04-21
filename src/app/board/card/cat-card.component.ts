import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cat } from '../../models/board.models';

@Component({
  selector: 'app-cat-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [class]="'card--' + cat.status">
      @if (cat.status === 'cat' || cat.status === 'old-cat') {
        <img
          class="card__image"
          [src]="cat.imageUrl"
          [alt]="cat.name"
          loading="lazy"
        />
      }
      <div class="card__body">
        <div class="card__header">
          <span class="card__name">{{ cat.name }}</span>
          <span class="card__badge card__badge--cat">{{ statusLabel }}</span>
        </div>
        <div class="card__row">
          <span class="card__label">Age</span>
          <span class="card__value">{{ ageLabel }}</span>
        </div>

        @if (cat.breed) {
          <div class="card__row">
            <span class="card__label">Breed</span>
            <span class="card__value">{{ cat.breed }}</span>
          </div>
        }

        @if (cat.color) {
          <div class="card__row">
            <span class="card__label">Color</span>
            <span class="card__value">{{ cat.color }}</span>
          </div>
        }

        @if (cat.status === 'cat' || cat.status === 'old-cat') {
          <div class="card__row">
            <span class="card__label">Weight</span>
            <span class="card__value">{{ cat.weight }} kg</span>
          </div>
        }

        @if (cat.status === 'old-cat') {
          <div class="card__row card__row--notes">
            <span class="card__label">Health</span>
            <span class="card__value">{{ cat.healthNotes }}</span>
          </div>
          <div class="card__row card__row--notes">
            <span class="card__label">Needs</span>
            <span class="card__value">{{ cat.specialNeeds }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class CatCardComponent {
  @Input({ required: true }) cat!: Cat;

  get statusLabel(): string {
    return { kitten: 'Kitten', cat: 'Cat', 'old-cat': 'Old Cat' }[
      this.cat.status
    ];
  }

  get ageLabel(): string {
    const m = this.cat.age;
    return m < 12
      ? `${m} mo`
      : `${Math.floor(m / 12)} yr ${m % 12 > 0 ? (m % 12) + ' mo' : ''}`.trim();
  }
}
