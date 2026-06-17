import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/auth-page";
import { SettingsPage } from "../pages/settings-page";

test.beforeEach(async ({ page }) => {
  // Each spec gets a fresh user so tests don't share state.
  const email = `settings-${Date.now()}@e2e.test`;
  const auth = new AuthPage(page);
  await auth.gotoSignUp();
  await auth.signUp("Settings User", email, "password-12345");
  await page.waitForURL("/");
});

test.describe("Settings navigation", () => {
  test("hub shows entry cards for every tab", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.gotoOverview();
    await expect(settings.cardByTitle("Account")).toBeVisible();
    await expect(settings.cardByTitle("Sessions")).toBeVisible();
    await expect(settings.cardByTitle("Libraries")).toBeVisible();
    await expect(settings.cardByTitle("Connection")).toBeVisible();
  });

  test("can navigate from hub to Account tab and back", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.gotoOverview();
    await settings.openTab("Account");
    await expect(
      page.getByRole("heading", { name: /^account$/i }),
    ).toBeVisible();
    await settings.openTab("Overview");
    await expect(page.getByRole("heading", { name: /^settings$/i })).toBeVisible();
  });

  test("Sessions tab lists at least the current device", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.gotoOverview();
    await settings.openTab("Sessions");
    await expect(page.getByText(/this device/i)).toBeVisible();
  });
});

test.describe("Libraries tab", () => {
  test("create-library form is visible and accepts input", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.gotoOverview();
    await settings.openTab("Libraries");
    await page.getByLabel(/^name$/i).fill("Side Library");
    await page.getByLabel(/library root/i).fill("/tmp/side");
    // Don't actually submit (would need API state); just verify wiring.
    await expect(page.getByRole("button", { name: /create library/i })).toBeEnabled();
  });
});
