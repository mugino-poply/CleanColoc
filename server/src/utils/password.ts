export const validatePassword = (pwd: string, userAge: number): boolean => {
  if (!pwd) return false; // Branch 1
  if (pwd.length < 8) return false; // Branch 2
  if (pwd.length > 20) return false; // Branch 3

  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasLowerCase = /[a-z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  if (userAge < 12) {
    // Enfant : règles souples
    if (!hasLowerCase) return false; // Branch 4
    return true;
  } else if (userAge >= 12 && userAge < 65) {
    // Adulte : règles strictes
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) return false; // Branch 5 (complexe)
    if (!hasSpecial) return false; // Branch 6
  } else {
    // Senior : règles moyennes
    if (!hasNumbers && !hasUpperCase) return false; // Branch 7
  }

  return true; // Branch final
};
