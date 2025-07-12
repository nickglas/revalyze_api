import "reflect-metadata";
import cron from "node-cron";
import { StripeSyncCron } from "../../sync/sync-cron";
import { StripeSyncService } from "../../services/stripe.sync.service";
import { logger } from "../../utils/logger";

jest.mock("node-cron", () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));
jest.mock("../../utils/logger");
jest.mock("../../services/stripe.sync.service");

describe("StripeSyncCron", () => {
  let stripeSyncCron: StripeSyncCron;
  let mockSyncService: jest.Mocked<StripeSyncService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSyncService = {
      syncProducts: jest.fn(),
    } as unknown as jest.Mocked<StripeSyncService>;

    stripeSyncCron = new StripeSyncCron(mockSyncService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should schedule a cron job with the correct schedule", () => {
    stripeSyncCron.start();
    expect(cron.schedule).toHaveBeenCalledWith(
      "* * * * *",
      expect.any(Function)
    );
  });

  it("should only schedule cron once", () => {
    stripeSyncCron.start();
    stripeSyncCron.start();
    stripeSyncCron.start();
    expect(cron.schedule).toHaveBeenCalledTimes(1);
  });

  it("should not schedule multiple cron jobs when start is called multiple times", () => {
    stripeSyncCron.start();
    stripeSyncCron.start();
    stripeSyncCron.start();
    expect(cron.schedule).toHaveBeenCalledTimes(1);
  });

  it("should log when cron job starts and completes successfully", async () => {
    stripeSyncCron.start();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

    await cronCallback();

    expect(logger.info).toHaveBeenCalledWith("🔄 Starting Stripe sync...");
    expect(mockSyncService.syncProducts).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("✅ Sync complete");
  });

  it("should handle service errors gracefully", async () => {
    const error = new Error("Sync failed");
    mockSyncService.syncProducts.mockRejectedValue(error);
    stripeSyncCron.start();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

    await cronCallback();

    expect(logger.error).toHaveBeenCalledWith("❌ Sync failed:", error);
  });

  it("should run at the scheduled interval", async () => {
    stripeSyncCron.start();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

    await cronCallback();
    expect(mockSyncService.syncProducts).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60 * 1000);

    await cronCallback();
    expect(mockSyncService.syncProducts).toHaveBeenCalledTimes(2);
  });

  it("should not run concurrently if previous job is still executing", async () => {
    let resolveSync: () => void;
    const syncPromise = new Promise<void>((resolve) => {
      resolveSync = resolve;
    });

    mockSyncService.syncProducts.mockImplementation(async () => {
      await syncPromise;
    });

    stripeSyncCron.start();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

    const firstCall = cronCallback();

    jest.advanceTimersByTime(30 * 1000);

    await cronCallback();

    expect(mockSyncService.syncProducts).toHaveBeenCalledTimes(1);

    resolveSync!();

    await firstCall;

    jest.advanceTimersByTime(30 * 1000);

    await cronCallback();

    expect(mockSyncService.syncProducts).toHaveBeenCalledTimes(2);
  });

  it("should log when cron job starts even if service isn't called", async () => {
    const brokenCron = new StripeSyncCron(null as unknown as StripeSyncService);
    brokenCron.start();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

    await cronCallback();

    expect(logger.info).toHaveBeenCalledWith("🔄 Starting Stripe sync...");
    expect(logger.error).toHaveBeenCalledWith(
      "❌ Sync failed:",
      expect.any(Error)
    );
  });
});
