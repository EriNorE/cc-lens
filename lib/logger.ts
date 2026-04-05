/** Structured logger for cc-lens — JSON output in production, readable in dev */

const isDev = process.env.NODE_ENV !== "production";

function log(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
) {
  if (level === "debug" && !isDev) return;

  if (isDev) {
    const prefix = { debug: "DBG", info: "INF", warn: "WRN", error: "ERR" }[
      level
    ];
    const ctx = context ? ` ${JSON.stringify(context)}` : "";
    console[level === "debug" ? "log" : level](
      `[cc-lens:${prefix}] ${message}${ctx}`,
    );
  } else {
    console[level === "debug" ? "log" : level](
      JSON.stringify({
        level,
        message,
        ...context,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
};
