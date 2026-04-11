import { validatePassword } from "../utils/password";

describe("Password Validator - White Box Testing", () => {
    // Test initial pour initialiser le rapport de couverture
    // Ce test ne couvre que la première ligne de la fonction (Branch 1)
    it("devrait rejeter un mot de passe vide", () => {
        const result = validatePassword("", 25);
        expect(result).toBe(false);
    });
    // Branch 2
    it("devrait rejeter un mot de passe inférieur à 8 caractères", () => {
        const result = validatePassword("bonjour", 20);
        expect(result).toBe(false);
    });
    // Branch 3
    it("devrait rejeter un mot de passe supérieur à 20 caractères", () => {
        const result = validatePassword("salutbonjourtuvasbien", 18);
        expect(result).toBe(false);
    });
    // Branch 4
    it("devrait rejeter un mot de passe qui n'a pas de minuscules pour les - de 12 ans", () => {
        const result = validatePassword("SALUTMEC", 10);
        expect(result).toBe(false);
    });
    // Branch 5
    it("devrait rejeter un mot de passe qui n'a pas de majuscules", () => {
        const result = validatePassword("azerty123", 15);
        expect(result).toBe(false);
    });
    it("devrait rejeter un mot de passe qui n'a pas de minuscules", () => {
        const result = validatePassword("AZERTY123", 22);
        expect(result).toBe(false);
    });
    it("devrait rejeter un mot de passe qui n'a pas de chiffres", () => {
        const result = validatePassword("AZERTyuiop", 45);
        expect(result).toBe(false);
    });
    // Branch 6
    it("devrait rejeter un mot de passe qui n'a pas de caractères spéciaux", () => {
        const result = validatePassword("AZErty123", 33);
        expect(result).toBe(false);
    });
    // Branch 7
    it("devrait rejeter un mot de passe qui ne contient ni chiffre ni majuscule", () => {
        const result = validatePassword("azertyuiop", 66);
        expect(result).toBe(false);
    });
    // Branch finale
    it("devrait accepter un mot de passe qui ne contient ni chiffre ni majuscule pour un enfant de - de 8 ans", () => {
        const result = validatePassword("azertyuiop", 8);
        expect(result).toBe(true);
    });
    it("devrait accepter un mot de passe qui contient un chiffre, une majuscule, et un caractère spécial pour un adulte", () => {
        const result = validatePassword("AZErty123!", 51);
        expect(result).toBe(true);
    });
    it("devrait accepter un mot de passe qui ne contient qu'un chiffre et pas de majuscule", () => {
        const result = validatePassword("azerty123", 78);
        expect(result).toBe(true);    
    });
    it("devrait accepter un mot de passe qui ne contient qu'une majuscule et pas de chiffre", () => {
        const result = validatePassword("AZERTyuiop", 99);
        expect(result).toBe(true); 
    });
});