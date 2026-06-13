/// <reference types="node" />

import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "beat120.wav");
const AUDIO_FILE_INPUT = 'input[accept*="audio"]';

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase("beat-visualizer");
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
});

test("import, analyze, preview, and export an MP4", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Beat Visualizer" })).toBeVisible();

  // Import the fixture audio through the audio track's hidden file input.
  await page.locator(AUDIO_FILE_INPUT).first().setInputFiles(FIXTURE);

  // Analysis populates the beat grid; the fixture is authored at 120 BPM.
  const bpmInput = page.locator("#bpm");
  await expect(bpmInput).toBeVisible({ timeout: 30_000 });
  const bpm = Number(await bpmInput.inputValue());
  expect(Math.abs(bpm - 120)).toBeLessThan(4);

  // Add a visual clip at the playhead and confirm it appears with selection.
  await page.getByRole("button", { name: "Add visual clip at playhead" }).click();
  await expect(page.getByText("Particle Field").first()).toBeVisible();

  // Playback: space starts the transport and the clock advances.
  await page.keyboard.press("Space");
  await page.waitForTimeout(1200);
  await page.keyboard.press("Space");
  const clock = await page.getByText(/^\d{2}:\d{2}\.\d{2} \//).textContent();
  expect(clock).not.toContain("00:00.00 /");

  // Project song name becomes the export filename base.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Current song name").fill("Test Beat");
  await page.getByRole("button", { name: "Save" }).click();

  // Export a proof MP4 and verify a non-trivial file downloads.
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Wait for the capability check to finish; fail loudly if the browser
  // cannot encode (the export button stays disabled in that case).
  const exportButton = page.getByRole("button", { name: /Export (1080p|proof)/ });
  await expect(exportButton).toBeEnabled({ timeout: 15_000 });

  // Switch to proof quality to keep the test fast.
  await page.getByRole("combobox").last().click();
  await page.getByRole("option", { name: /Proof/ }).click();

  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await page.getByRole("button", { name: /Export proof/ }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^test_beat_16x9_proof\.mp4$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const { statSync } = await import("node:fs");
  const size = statSync(filePath).size;
  // 8 seconds of 960x540 video + audio must be at least ~100 KB.
  expect(size).toBeGreaterThan(100_000);
});

test("project persists across a reload", async ({ page }) => {
  await page.goto("/");
  await page.locator(AUDIO_FILE_INPUT).first().setInputFiles(FIXTURE);
  await expect(page.locator("#bpm")).toBeVisible({ timeout: 30_000 });

  await page.reload();
  // The restored project re-decodes audio and re-runs analysis.
  await expect(page.locator("#bpm")).toBeVisible({ timeout: 30_000 });
});

test("file open shows the current project even before edits are saved", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Open" }).click();

  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open project Untitled" })).toBeVisible();
  await expect(page.getByText("Current")).toBeVisible();
  await page.getByRole("button", { name: "Editor" }).click();
  await expect(page.getByText("Select a clip to edit its settings.")).toBeVisible();
});

test("settings save app settings and current project song name", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();

  await page.getByLabel("Artist name").fill("Light Sculptor");
  await page.getByLabel("Website").fill("not-a-url");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Use a valid http:// or https:// URL.").first()).toBeVisible();

  await page.getByLabel("Website").fill("https://example.com");
  await page.getByLabel("Instagram").fill("https://instagram.com/lightsculptor");
  await page.getByLabel("TikTok").fill("https://tiktok.com/@lightsculptor");
  await page.getByLabel("Snapchat").fill("https://snapchat.com/add/lightsculptor");
  await page.getByLabel("X").fill("https://x.com/lightsculptor");
  await page.getByLabel("Custom message").fill("Visuals generated live.");
  await page.getByLabel("Current song name").fill("Loaded Ritual");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await page.waitForTimeout(1_000);
  await page.reload();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Artist name")).toHaveValue("Light Sculptor");
  await expect(page.getByLabel("Website")).toHaveValue("https://example.com");
  await expect(page.getByLabel("Instagram")).toHaveValue("https://instagram.com/lightsculptor");
  await expect(page.getByLabel("TikTok")).toHaveValue("https://tiktok.com/@lightsculptor");
  await expect(page.getByLabel("Snapchat")).toHaveValue("https://snapchat.com/add/lightsculptor");
  await expect(page.getByLabel("X")).toHaveValue("https://x.com/lightsculptor");
  await expect(page.getByLabel("Custom message")).toHaveValue("Visuals generated live.");
  await expect(page.getByLabel("Current song name")).toHaveValue("Loaded Ritual");
});

test("file new project resets current state, preserves app settings, and old projects stay openable", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Artist name").fill("Light Sculptor");
  await page.getByLabel("Current song name").fill("First Project");
  await page.getByRole("button", { name: "Save" }).click();

  await page.locator(AUDIO_FILE_INPUT).first().setInputFiles(FIXTURE);
  await expect(page.locator("#bpm")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "New" }).click();

  await expect(page.locator("#bpm")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeDisabled();
  await expect(page.getByText("Select a clip to edit its settings.")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Artist name")).toHaveValue("Light Sculptor");
  await expect(page.getByLabel("Current song name")).toHaveValue("");

  await page.getByRole("button", { name: "Editor" }).click();
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Open" }).click();

  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByText("First Project")).toBeVisible();
  await expect(page.getByText("Current")).toBeVisible();

  await page.getByRole("button", { name: "Open project Untitled" }).filter({ hasText: "First Project" }).click();
  await expect(page.locator("#bpm")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Current song name")).toHaveValue("First Project");
});

test("project browser confirms and deletes a non-current project without opening it", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Current song name").fill("Delete Me Later");
  await page.getByRole("button", { name: "Save" }).click();
  await page.locator(AUDIO_FILE_INPUT).first().setInputFiles(FIXTURE);
  await expect(page.locator("#bpm")).toBeVisible({ timeout: 30_000 });
  await page.evaluate(async () => {
    // Wait for the imported audio blob to be written to IndexedDB.
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "New" }).click();

  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Open" }).click();
  const oldProject = page.getByTestId("project-card").filter({ hasText: "Delete Me Later" });
  await expect(oldProject).toBeVisible();
  await oldProject.getByTestId("delete-project").click();

  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toContainText("Delete Me Later");
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(deleteDialog).toBeHidden();
  await expect(page.getByText("Delete Me Later")).toHaveCount(0);
  await expect(page.getByTestId("project-card").filter({ hasText: "Current" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const request = indexedDB.open("beat-visualizer");
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
        const tx = db.transaction("assets", "readonly");
        const countRequest = tx.objectStore("assets").count();
        const count = await new Promise<number>((resolve, reject) => {
          countRequest.onerror = () => reject(countRequest.error);
          countRequest.onsuccess = () => resolve(countRequest.result);
        });
        db.close();
        return count;
      }),
    )
    .toBe(0);
});

test("project browser can delete the current project and stay open", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Current song name").fill("Current Delete");
  await page.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Open" }).click();
  const currentProject = page.getByTestId("project-card").filter({ hasText: "Current Delete" });
  await currentProject.getByTestId("delete-project").click();

  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByText("Current Delete")).toHaveCount(0);
  await expect(page.getByTestId("project-card")).toHaveCount(0);
  await expect(page.getByText("No stored projects yet.")).toBeVisible();
});
