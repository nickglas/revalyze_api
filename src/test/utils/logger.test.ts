// test/utils/logger.test.ts
import { logger } from "../../utils/logger";

describe("Logger Utility", () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, "info");
    errorSpy = jest.spyOn(logger, "error");
    debugSpy = jest.spyOn(logger, "debug");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call logger.info with a message", () => {
    const message = "This is an info log";
    logger.info(message);
    expect(infoSpy).toHaveBeenCalledWith(message);
  });

  it("should call logger.error with a message", () => {
    const message = "This is an error log";
    logger.error(message);
    expect(errorSpy).toHaveBeenCalledWith(message);
  });

  it("should call logger.debug with a message", () => {
    const message = "This is a debug log";
    logger.debug(message);
    expect(debugSpy).toHaveBeenCalledWith(message);
  });
});
