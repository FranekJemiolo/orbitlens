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

  test("should open Geolocation modal, select a world preset, and update observer coordinates", async ({
    page,
  }) => {
    await page.goto("/");

    // Click on GPS badge in Compass HUD
    const gpsBadge = page.locator('[data-testid="location-status-badge"]');
    await expect(gpsBadge).toBeVisible();
    await gpsBadge.click();

    // Location Modal should appear
    const locModal = page.locator('[data-testid="location-modal"]');
    await expect(locModal).toBeVisible();
    await expect(page.getByText(/OBSERVER GEOLOCATION/i)).toBeVisible();

    // Click Mauna Kea preset
    const maunaKeaBtn = page.locator('[data-testid="preset-mauna-kea"]');
    await expect(maunaKeaBtn).toBeVisible();
    await maunaKeaBtn.click();

    // Modal closes upon selection
    await expect(locModal).not.toBeVisible();

    // HUD badge should now reflect manual / preset location (Mauna Kea is ~19.82°N, -155.47°W)
    await expect(gpsBadge).toContainText("Mauna Kea");
  });

  test("should render All-Sky Radar Map and steer sky direction when clicking on radar", async ({
    page,
  }) => {
    await page.goto("/");

    // Radar should be visible by default
    const radar = page.locator('[data-testid="all-sky-radar-container"]');
    await expect(radar).toBeVisible();

    // Verify radar elements: SVG, cardinal markers, camera cursor
    const radarSvg = page.locator('[data-testid="all-sky-radar-svg"]');
    await expect(radarSvg).toBeVisible();
    const camCursor = page.locator('[data-testid="radar-cam-cursor"]');
    await expect(camCursor).toBeVisible();

    // Click on East quadrant of radar (right of center) to steer heading
    const box = await radarSvg.boundingBox();
    if (box) {
      // Click at center-right
      await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.5);
    }

    // Toggle radar off and on via drawer or quick button
    const toggleRadarBtn = page.locator('[data-testid="toggle-radar"]');
    await expect(toggleRadarBtn).toBeVisible();
    await toggleRadarBtn.click();
    await expect(radar).not.toBeVisible();

    await toggleRadarBtn.click();
    await expect(radar).toBeVisible();
  });

  test("should toggle 360° Sky Map mode for daytime stargazing and drag exploration", async ({
    page,
  }) => {
    await page.goto("/");

    const skymapToggle = page.locator('[data-testid="toggle-skymap"]');
    await expect(skymapToggle).toBeVisible();

    // Initially AR mode with video background visible
    const video = page.locator('[data-testid="camera-video"]');
    await expect(video).toBeVisible();

    // Switch to 360° Sky Map mode
    await skymapToggle.click();

    // Verify Sky Map badge indicator is displayed
    await expect(page.getByText(/360° SKY MAP/i)).toBeVisible();

    // Drag on AR container to rotate view
    const arContainer = page.locator('[data-testid="ar-view-container"]');
    await arContainer.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(250, 280);
    await page.mouse.up();

    // Toggle back to Live AR mode
    await skymapToggle.click();
    await expect(page.getByText(/360° SKY MAP/i)).not.toBeVisible();
  });
});
