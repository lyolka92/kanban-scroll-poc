import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dog } from '../../models/board.models';

@Component({
  selector: 'app-dog-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [class]="'card--' + dog.status">
      @if (dog.status === 'dog' || dog.status === 'old-dog') {
        <img
          class="card__image"
          [src]="dog.imageUrl"
          [alt]="dog.name"
          loading="lazy"
        />
      }
      <div class="card__body">
        <div class="card__header">
          <span class="card__name">{{ dog.name }}</span>
          <span class="card__badge card__badge--dog">{{ statusLabel }}</span>
        </div>
        <div class="card__row">
          <span class="card__label">Age</span>
          <span class="card__value">{{ ageLabel }}</span>
        </div>

        @if (dog.breed) {
          <div class="card__row">
            <span class="card__label">Breed</span>
            <span class="card__value">{{ dog.breed }}</span>
          </div>
        }

        @if (dog.color) {
          <div class="card__row">
            <span class="card__label">Color</span>
            <span class="card__value">{{ dog.color }}</span>
          </div>
        }

        @if (dog.status === 'dog' || dog.status === 'old-dog') {
          <div class="card__row">
            <span class="card__label">Weight</span>
            <span class="card__value">{{ dog.weight }} kg</span>
          </div>
        }

        @if (dog.status === 'old-dog') {
          <div class="card__row card__row--notes">
            <span class="card__label">Health</span>
            <span class="card__value">{{ dog.healthNotes }}</span>
          </div>
          <div class="card__row card__row--notes">
            <span class="card__label">Needs</span>
            <span class="card__value">{{ dog.specialNeeds }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class DogCardComponent {
  @Input({ required: true }) dog!: Dog;

  get statusLabel(): string {
    return { puppy: 'Puppy', dog: 'Dog', 'old-dog': 'Old Dog' }[
      this.dog.status
    ];
  }

  get ageLabel(): string {
    const m = this.dog.age;
    return m < 12
      ? `${m} mo`
      : `${Math.floor(m / 12)} yr ${m % 12 > 0 ? (m % 12) + ' mo' : ''}`.trim();
  }
}
