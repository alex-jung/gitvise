/**
 * Thin logging wrapper.
 * All calls compile down to standard console.* methods,
 * which Next.js SWC strips entirely in production builds
 * (see compiler.removeConsole in next.config.ts).
 */

const PREFIX = "[gitvise]";

export const log = {
  auth:     (...args: unknown[]) => console.log(`${PREFIX}[auth]`, ...args),
  nav:      (...args: unknown[]) => console.log(`${PREFIX}[nav]`, ...args),
  sync:     (...args: unknown[]) => console.log(`${PREFIX}[sync]`, ...args),
  settings: (...args: unknown[]) => console.log(`${PREFIX}[settings]`, ...args),
  warn:     (...args: unknown[]) => console.warn(`${PREFIX}`, ...args),
  error:    (...args: unknown[]) => console.error(`${PREFIX}`, ...args),
};
