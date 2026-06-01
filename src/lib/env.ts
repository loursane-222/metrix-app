const warnedEnvNames = new Set<string>();

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} environment variable is required in production.`);
  }

  if (!warnedEnvNames.has(name)) {
    warnedEnvNames.add(name);
    console.warn(
      `[security] ${name} is missing. Using a development-only fallback. Set ${name} for production-like auth tests.`,
    );
  }

  return `development-only-${name}-fallback`;
}

export function getJwtSecret(): string {
  return requiredEnv("JWT_SECRET");
}

export function getJwtSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}
