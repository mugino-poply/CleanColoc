// shipping.test.ts
import { calculateShipping } from '../utils/shipping';

describe('Shipping Calculator - Tests Fonctionnels', () => {

  // ── 1. Catalog & Boundaries ──────────────────────────────────────
  describe('1. Catalog & Boundaries', () => {

    // Valeurs limites - Distance
    test.each([
      [0,   5, 'standard', 10],
      [50,  5, 'standard', 10],
      [51,  5, 'standard', 25],
      [500, 5, 'standard', 25],
      [501, 5, 'standard', 50],
    ])(
      'Distance %i km -> Prix %i€ (standard)',
      (distance, weight, type, expected) => {
        expect(calculateShipping(distance, weight, type as 'standard' | 'express'))
          .toBe(expected);
      }
    );

    // Valeurs limites - Poids
    test.each([
      [10, 9,  'standard',  10],   // Léger : pas de majoration
      [10, 10, 'standard',  15],   // Lourd : +50%
      [10, 50, 'standard',  15],   // Limite max valide
    ])(
      'Poids %i kg -> Prix %i€ (standard)',
      (distance, weight, type, expected) => {
        expect(calculateShipping(distance, weight, type as 'standard' | 'express'))
          .toBe(expected);
      }
    );

    // Cas invalides - Exceptions
    test.each([
      [-1,  5,  'standard', 'Invalid distance'],
      [10,  0,  'standard', 'Invalid weight'],
      [10, -5,  'standard', 'Invalid weight'],
      [10,  51, 'standard', 'Invalid weight'],
    ])(
      'Entrée invalide (%i, %i) doit lever "%s"',
      (distance, weight, type, errorMsg) => {
        expect(() =>
          calculateShipping(distance, weight, type as 'standard' | 'express')
        ).toThrow(errorMsg);
      }
    );
  });

  // ── 2. Pairwise Combinations ─────────────────────────────────────
  describe('2. Pairwise Combinations', () => {

    test.each([
      [25,  2,  'standard',  10  ],  // D1, W1, T1
      [25,  20, 'express',   30  ],  // D1, W2, T2
      [100, 2,  'express',   50  ],  // D2, W1, T2
      [200, 40, 'standard',  37.5],  // D2, W2, T1
      [600, 2,  'express',   100 ],  // D3, W1, T2
      [800, 40, 'standard',  75  ],  // D3, W2, T1
    ])(
      'Scénario : %i km, %i kg, %s -> Total %i €',
      (distance, weight, type, expected) => {
        expect(calculateShipping(distance, weight, type as 'standard' | 'express'))
          .toBe(expected);
      }
    );
  });
});