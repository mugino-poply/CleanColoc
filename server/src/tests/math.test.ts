// Fonction à tester (normalement importée depuis votre code)
const add = (a: number, b: number) => a + b;

describe('Math Utils', () => {
    it('devrait additionner deux nombres correctement', () => {
        const result = add(2, 3);
        expect(result).toBe(5);
    });

    it('devrait gérer les nombres négatifs', () => {
        expect(add(-1, -1)).toBe(-2);
    });
});