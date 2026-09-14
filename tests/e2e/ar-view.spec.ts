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
    await expect(page.getByText("Planets & Moon")).toBeVisible();
    await expect(page.getByText(/Stars/)).toBeVisible();
    await expect(page.getByText("Constellations")).toBeVisible();
    await expect(page.getByText("Satellites (ISS)")).toBeVisible();
    await expect(page.getByText("Aircraft (ADS-B)")).toBeVisible();
    await expect(page.getByText(/Meteor/)).toBeVisible();
  });

  test("should open Celestial Target Finder, search for a target, and activate Target Guidance", async ({
    page,
  }) => {
    await page.goto("/");

    const searchBtn = page.locator('[data-testid="open-search-button"]');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    const searchModal = page.locator('[data-testid="search-modal"]');
    await expect(searchModal).toBeVisible();

    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill("Jupiter");

    // Verify Jupiter search result appears
    const jupiterItem = page.locator('[data-testid="search-item-sol-jupiter"]');
    await expect(jupiterItem).toBeVisible();

    // Click to track Jupiter
    await jupiterItem.click();

    // Search modal should close
    await expect(searchModal).not.toBeVisible();

    // Target guide HUD should be active
    const guideHud = page.locator('[data-testid="target-guide-hud"]');
    await expect(guideHud).toBeVisible();
    await expect(guideHud).toContainText("Jupiter");

    // Clear tracking target
    const clearBtn = page.locator('[data-testid="clear-tracking-target"]');
    await clearBtn.click();
    await expect(guideHud).not.toBeVisible();
  });

  test("should open and close AR User Guide & Tactical Legend modal", async ({
    page,
  }) => {
    await page.goto("/");

    const helpBtn = page.locator('[data-testid="open-help-button"]');
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();

    const helpModal = page.locator('[data-testid="help-modal"]');
    await expect(helpModal).toBeVisible();
    await expect(page.getByText(/TACTICAL LEGEND/i)).toBeVisible();
    await expect(page.getByText(/Planets & Moon/i)).toBeVisible();

    const closeHelpBtn = page.locator('[data-testid="close-help-modal"]');
    await closeHelpBtn.click();
    await expect(helpModal).not.toBeVisible();
  });
});
