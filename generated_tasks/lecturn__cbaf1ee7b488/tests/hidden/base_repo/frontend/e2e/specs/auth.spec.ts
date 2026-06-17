import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/auth-page";

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.test`;

test.describe("Sign-up flow", () => {
  test("new user can sign up and land on the home shelf", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignUp();
    await auth.signUp("Alice E2E", uniqueEmail("alice"), "alice-password-12345");
    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: /your shelf/i })).toBeVisible();
  });

  test("rejects passwords shorter than 8 characters (client-side disabled state)", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignUp();
    await auth.nameInput.fill("X");
    await auth.emailInput.fill(uniqueEmail("short"));
    await auth.passwordInput.fill("short");
    // The submit button should be disabled while the password meter says "Too short".
    await expect(auth.submit).toBeDisabled();
  });

  test("links to sign-in from the sign-up footer", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignUp();
    await page.getByRole("link", { name: /sign in instead/i }).click();
    await page.waitForURL("/sign-in*");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});

test.describe("Sign-in flow", () => {
  test("rejects unknown email with an inline error", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignIn();
    await auth.signIn(uniqueEmail("ghost"), "wrong-password-1234");
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("magic link mode shows a 'Check your email' card after submit", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignIn();
    await auth.toggleMagicLinkMode();
    await auth.emailInput.fill(uniqueEmail("magic"));
    await page.getByRole("button", { name: /send magic link/i }).click();
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  });

  test("'forgot password' switches to magic-link mode", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignIn();
    await auth.toggleForgotPassword();
    await expect(
      page.getByRole("button", { name: /send magic link/i }),
    ).toBeVisible();
  });
});

test.describe("Route protection", () => {
  test("anonymous request to / redirects to /sign-in with a next= param", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });

  test("anonymous request to /settings/account redirects to /sign-in", async ({ page }) => {
    await page.goto("/settings/account");
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
});
