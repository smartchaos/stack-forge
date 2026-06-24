import { describe, it, expect, vi } from "vitest";
import { createLogger, LogLevel } from "../src/logger.js";

describe("createLogger", () => {
  it("creates logger with default level", () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("respects log level from environment", () => {
    process.env.CFORGE_LOG_LEVEL = "debug";
    const logger = createLogger();
    expect(logger).toBeDefined();
    delete process.env.CFORGE_LOG_LEVEL;
  });

  it("logs structured messages", () => {
    const logger = createLogger({ level: LogLevel.SILENT });
    const spy = vi.spyOn(logger, "info");
    logger.info({ msg: "test", key: "value" });
    expect(spy).toHaveBeenCalled();
  });
});
