import { type Locator, type Page, expect } from "@playwright/test";

// Page object for the sign-in / sign-up screens. Encapsulates selector
// knowledge so spec files read at the user-action level rather than
// chasing locator strings around.
export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nameInput: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i, { exact: false });
    this.nameInput = page.getByLabel(/name/i);
    this.submit = page.getByRole("button", { name: /(sign in|create account|send magic link)/i });
  }

  async gotoSignIn() {
    await this.page.goto("/sign-in");
    await expect(this.page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  }

  async gotoSignUp() {
    await this.page.goto("/sign-up");
    await expect(this.page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submit.click();
  }

  async signUp(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submit.click();
  }

  async toggleMagicLinkMode() {
    await this.page.getByRole("radio", { name: /magic link/i }).click();
  }

  async toggleForgotPassword() {
    await this.page.getByRole("button", { name: /forgot password/i }).click();
  }
}
