import { validateUserRegistration } from "../utils/userValidator";

describe("User Validator - White Box Testing", () => {
    // Branch 1 : NaN
    it("devrait retourner false pour un âge NaN", () => {
        const result = validateUserRegistration(NaN, "user", "a@b.com");
        expect(result).toBe(false);
    });

    // Branch 3 : age < 18, role != stagiaire
    it("devrait retourner false pour un mineur non stagiaire", () => {
        const result = validateUserRegistration(17, "user", "a@b.com");
        expect(result).toBe(false);
    });

    // Branch 4 : stagiaire mineur
    it("devrait valider un stagiaire de moins de 18 ans", () => {
        const result = validateUserRegistration(17, "stagiaire", "stagiaire@17.ans");
        expect(result).toBe(true);
    });

    // Branch 5 : age > 120
    it("devrait lever une erreur pour un âge > 120", () => {
        expect(() => validateUserRegistration(121, "admin", "a@b.com"))
            .toThrow("Âge invalide");
    });

    // Branch 7 : role invalide
    it("devrait lever une erreur pour un rôle invalide", () => {
        expect(() => validateUserRegistration(25, "hacker", "a@b.com"))
            .toThrow("Rôle invalide");
    });

    // Branch 9 : email invalide
    it("devrait retourner false pour un email invalide", () => {
        const result = validateUserRegistration(25, "user", "invalid");
        expect(result).toBe(false);
    });
})