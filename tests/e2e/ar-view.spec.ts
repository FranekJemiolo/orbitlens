import { test, expect } from "@playwright/test";

test.describe("OrbitLens AR Celestial Tracker & Sensor Fusion", () => {
  test.beforeEach(async ({ page }) => {
    // Mock getUserMedia, Geolocation, and DeviceOrientation
    await page.addInitScript(() => {
      // 1. Mock Camera MediaStream
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

      // 2. Mock Geolocation
      navigator.geolocation.watchPosition = (success) => {
        setTimeout(() => {
          success({
            coords: {
              latitude: 52.2297,
              longitude: 21.0122,
              altitude: 120,
              accuracy: 5,
              altitudeAccuracy: 5,
              heading: 180,
              speed: 0,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }, 50);
        return 1;
      };
      navigator.geolocation.clearWatch = () => {};

      // 3. Dispatch synthetic DeviceOrientationEvent
      setTimeout(() => {
        const event = new Event("deviceorientation") as unknown as {
          alpha: number;
          beta: number;
          gamma: number;
          webkitCompassHeading?: number;
        };
        event.alpha = 180;
        event.beta = 45;
        event.gamma = 0;
        event.webkitCompassHeading = 180;
        window.dispatchEvent(event as unknown as Event);
      }, 200);
    });
  });

  test("should render AR view with canvas, video background, and tactical reticle", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify background video and WebGL canvas elements
    const video = page.locator('[data-testid="camera-video"]');
    const canvas = page.locator('[data-testid="webgl-canvas"]');

    await expect(video).toBeVisible({ timeout: 10000 });
    await expect(canvas).toBeVisible();

    // Verify central reticle is mounted
    const arContainer = page.locator('[data-testid="ar-view-container"]');
    await expect(arContainer).toBeVisible();

    // Verify HUD elements
    await expect(page.getByText(/GPS (FIX|LOCK)/)).toBeVisible();
    await expect(page.getByText(/NORTH|EAST|SOUTH|WEST/)).toBeVisible();
    await expect(page.getByText(/PITCH|ATTITUDE/)).toBeVisible();
  });

  test("should toggle Astro-Red Tactical Night Vision mode and update body class", async ({
    page,
  }) => {
    await page.goto("/");

    const nvToggle = page.locator('[data-testid="night-vision-toggle"]');
    await expect(nvToggle).toBeVisible();

    // Initially night vision is not active
    await expect(page.locator("body")).not.toHaveClass(/night-vision-active/);

    // Click to enable
    await nvToggle.click();
    await expect(page.locator("body")).toHaveClass(/night-vision-active/);
    await expect(page.getByText("NV ACTIVE")).toBeVisible();

    // Click to disable
    await nvToggle.click();
    await expect(page.locator("body")).not.toHaveClass(/night-vision-active/);
    await expect(page.getByText("NIGHT VISION")).toBeVisible();
  });

  test("should allow toggling tactical layers in settings drawer", async ({
    page,
  }) => {
    await page.goto("/");

    const settingsBtn = page.locator('[data-testid="layer-settings-toggle"]');
    await settingsBtn.click();

    await expect(page.getByText(/TACTICAL LAYERS/)).toBeVisible();
    await expect(page.getByText(/Stars/)).toBeVisible();
    await expect(page.getByText("Constellations")).toBeVisible();
    await expect(page.getByText("Satellites (ISS)")).toBeVisible();
    await expect(page.getByText("Aircraft (ADS-B)")).toBeVisible();
    await expect(page.getByText(/Meteor/)).toBeVisible();
  });
});
