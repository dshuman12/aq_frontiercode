import { type Locator, type Page, expect } from "@playwright/test";

// Page object for the /settings hub and its tabs.
export class SettingsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoOverview() {
    await this.page.goto("/settings");
    await expect(this.page.getByRole("heading", { name: /^settings$/i })).toBeVisible();
  }

  async openTab(name: "Account" | "Sessions" | "Libraries" | "Connection" | "Overview") {
    await this.page.getByRole("link", { name }).click();
  }

  cardByTitle(title: string): Locator {
    return this.page.getByText(title, { exact: true });
  }
}
