type Role = "admin" | "user" | "stagiaire";

export function validateUserRegistration(
  age: number,
  role: Role | string,
  email: string
): boolean {
  // 1. Vérifier age
  if (Number.isNaN(age)) {
    return false; // branch 1 (TRUE)
  }
  // branch 2 (FALSE de isNaN → on continue)

  else if (age < 18 && role !== "stagiaire") {
    return false; // branch 3 (TRUE)
  }
  // branch 4 (FALSE → age >= 18, ou role === "stagiaire")

  else if (age > 120) {
    throw new Error("Âge invalide"); // branch 5 (TRUE)
  }
  // branch 6 (FALSE → age <= 120)

  // 2. Vérifier role
  if (!["admin", "user", "stagiaire"].includes(role)) {
    throw new Error("Rôle invalide"); // branch 7 (TRUE)
  }
  // branch 8 (FALSE → role valide)

  // 3. Vérifier email
  if (!email || !(email.includes("@") && email.includes("."))) {
    return false; // branch 9 (TRUE)
  }
  // branch 10 (FALSE → email valide)

  return true;
}