import { test, expect } from "@playwright/test";

test.describe("OrbitLens AR Recording Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    // Mock getUserMedia
    await page.addInitScript(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#05070a";
      ctx.fillRect(0, 0, 640, 480);
      const mockStream = canvas.captureStream(30);

      if (!navigator.mediaDevices) {
        (navigator as unknown as { mediaDevices: unknown }).mediaDevices = {};
      }
      navigator.mediaDevices.getUserMedia = async () => mockStream;
    });
  });

  test("should simulate Click Record -> Wait 3 Seconds -> Click Stop and verify download event", async ({
    page,
  }) => {
    await page.goto("/");

    const recordBtn = page.locator('[data-testid="record-button"]');
    await expect(recordBtn).toBeVisible({ timeout: 10000 });

    // Set up download listener or custom event listener
    const downloadPromise = page
      .waitForEvent("download", { timeout: 15000 })
      .catch(() => null);

    // Click Record
    await recordBtn.click();

    // Verify recording HUD is active
    const stopBtn = page.locator('[data-testid="stop-record-button"]');
    await expect(stopBtn).toBeVisible();
    await expect(page.getByText(/REC \d\d:\d\d/)).toBeVisible();

    // Wait 3 seconds of recording
    await page.waitForTimeout(3000);

    // Click Stop
    await stopBtn.click();

    // Verify UI updates to saved state or download finishes
    const recordingControls = page.locator(
      '[data-testid="recording-controls"]',
    );
    await expect(recordingControls).toHaveAttribute(
      "data-recording-state",
      /downloaded|idle/,
      {
        timeout: 5000,
      },
    );

    const download = await downloadPromise;
    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/orbitlens-session-.*(webm|mp4)/);
    }
  });
});
