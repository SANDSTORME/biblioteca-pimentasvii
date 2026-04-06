export const validatePasswordStrength = (password: string) => {
  const rules = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];

  if (rules.every(Boolean)) {
    return { valid: true as const };
  }

  return {
    valid: false as const,
    message: 'A senha precisa ter ao menos 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.',
  };
};
