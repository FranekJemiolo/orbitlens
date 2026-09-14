import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("Generate high-res promotional screenshots for documentation", async ({
  page,
}) => {
  // Ensure docs/assets directory exists
  const assetsDir = path.resolve(import.meta.dirname, "../docs/assets");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Set high-DPI viewport (iPhone 14 Pro mobile dimensions)
  await page.setViewportSize({ width: 393, height: 852 });

  // Add realistic simulated sensor & camera mocks
  await page.addInitScript(() => {
    // 1. Mock Camera MediaStream with dark starry night gradient
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;

    // Atmospheric night gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, "#04070D");
    grad.addColorStop(0.7, "#070C16");
    grad.addColorStop(1, "#0C1322");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    const stream = canvas.captureStream(30);
    if (!navigator.mediaDevices) {
      (navigator as unknown as { mediaDevices: unknown }).mediaDevices = {};
    }
    navigator.mediaDevices.getUserMedia = async () => stream;

    // 2. Mock GPS at Mauna Kea Observatory
    navigator.geolocation.watchPosition = (success) => {
      setTimeout(() => {
        success({
          coords: {
            latitude: 19.8206,
            longitude: -155.4681,
            altitude: 4205,
            accuracy: 3,
            altitudeAccuracy: 3,
            heading: 110,
            speed: 0,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      }, 50);
      return 1;
    };
    navigator.geolocation.clearWatch = () => {};

    // 3. Dispatch Orientation pointing toward Orion / Zenith
    setTimeout(() => {
      const event = new Event("deviceorientation") as unknown as {
        alpha: number;
        beta: number;
        gamma: number;
        webkitCompassHeading?: number;
      };
      event.alpha = 110;
      event.beta = 55;
      event.gamma = -5;
      event.webkitCompassHeading = 110;
      window.dispatchEvent(event as unknown as Event);
    }, 150);
  });

  await page.goto("/");

  // Wait for canvas, star catalog and HUD to settle
  await page.waitForSelector('[data-testid="webgl-canvas"]');
  await page.waitForTimeout(2000);

  // 1. Capture Standard Tactical View
  const previewPath = path.join(assetsDir, "orbitlens-preview.png");
  await page.screenshot({ path: previewPath, fullPage: true });
  console.log(`Saved tactical preview screenshot to ${previewPath}`);

  // 2. Enable Night Vision Mode
  const nvToggle = page.locator('[data-testid="night-vision-toggle"]');
  await nvToggle.click();
  await page.waitForTimeout(800);

  // 3. Capture Astro-Red Night Vision View
  const nvPath = path.join(assetsDir, "orbitlens-nightvision.png");
  await page.screenshot({ path: nvPath, fullPage: true });
  console.log(`Saved night vision screenshot to ${nvPath}`);
});
