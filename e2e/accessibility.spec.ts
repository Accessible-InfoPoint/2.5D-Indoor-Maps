import AxeBuilder from "@axe-core/playwright";
import { Result } from "axe-core";
import { expect, Page, test } from "@playwright/test";
import { loadTestApp } from "./testApp";

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .exclude("#map")
    .exclude("#flatMap")
    .exclude(".maplibregl-control-container")
    .analyze();

  logAccessibilityViolations(results.violations);

  const failingViolations = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  expect(failingViolations).toEqual([]);
}

function logAccessibilityViolations(violations: Result[]): void {
  if (violations.length === 0) {
    console.info("axe: no accessibility violations found.");
    return;
  }

  console.info("axe accessibility violations:");
  console.table(
    violations.map((violation) => ({
      impact: violation.impact ?? "unknown",
      rule: violation.id,
      description: violation.description,
      nodes: violation.nodes.map((node) => node.target.join(", ")).join(" | "),
      help: violation.helpUrl,
    })),
  );
}

test("initial UI has no serious accessibility violations", async ({ page }) => {
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await expectNoSeriousAccessibilityViolations(page);
});

test("wheelchair mode has no serious accessibility violations", async ({ page }) => {
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.getByRole("button", { name: /switch to wheelchair|rollstuhl/i }).click();
  await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);

  await expectNoSeriousAccessibilityViolations(page);
});

test("visual settings modal has no serious accessibility violations", async ({ page }) => {
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
  await expect(
    page.getByRole("dialog", { name: /visual settings|grafische einstellungen/i }),
  ).toBeVisible();

  await expectNoSeriousAccessibilityViolations(page);
});

test("feature selection modal has no serious accessibility violations", async ({ page }) => {
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.getByRole("button", { name: /feature selection|auswahl/i }).click();
  await expect(
    page.getByRole("dialog", { name: /select features|anzuzeigende objekte/i }),
  ).toBeVisible();

  await expectNoSeriousAccessibilityViolations(page);
});

test("mobile layout has no serious accessibility violations", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);
  await expect(page.locator("#uiWrapper")).toHaveClass(/mobileMode/);

  await expectNoSeriousAccessibilityViolations(page);
});

test("mobile popovers have no serious accessibility violations when open", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.locator("#mobileLegendTrigger").click();
  await expect(page.locator("#legendWrapper")).toHaveClass(/open/);

  await expectNoSeriousAccessibilityViolations(page);
});
