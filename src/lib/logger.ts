// Dev-only logger. Replaces the old DebugConsole console interception.
// In production builds (import.meta.env.PROD) log/info/warn are no-ops;
// errors always surface so real problems still reach the browser console.
const isDev = import.meta.env.DEV

type Args = unknown[]

export const logger = {
  log: (...a: Args) => { if (isDev) console.log(...a) },
  info: (...a: Args) => { if (isDev) console.info(...a) },
  warn: (...a: Args) => { if (isDev) console.warn(...a) },
  error: (...a: Args) => { console.error(...a) },
}
