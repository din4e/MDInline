import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("renders the editor workspace and primary actions", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "微信 Markdown 排版" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Markdown 编辑" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "公众号预览" })).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 HTML" })).toBeVisible();
});

test("switches style categories with accessible tabs", async ({ page }) => {
  await expect(page.getByRole("combobox", { name: "加粗字重" })).toContainText("粗体 700");

  const codeTab = page.getByRole("tab", { name: "代码" });
  await codeTab.click();

  await expect(codeTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "行内代码" })).toBeVisible();
  await expect(page.getByText("启用代码高亮")).toBeVisible();
});

test("saves a named theme through the shadcn dialog", async ({ page }) => {
  await page.getByRole("button", { name: "更多主题操作" }).click();
  await page.getByRole("menuitem", { name: "保存当前主题" }).click();

  const dialog = page.getByRole("dialog", { name: "保存当前主题" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("主题名称").fill("测试主题");
  await dialog.getByRole("button", { name: "保存主题" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("已保存主题「测试主题」到主题库")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "选择我的主题" })).toBeEnabled();
});

test("opens the template market and applies a template", async ({ page }) => {
  await page.getByRole("button", { name: "模板市场" }).click();

  const dialog = page.getByRole("dialog", { name: "模板市场" });
  await expect(dialog).toBeVisible();

  // Filter narrows the grid to the 暗色 category.
  await dialog.getByRole("button", { name: "暗色", exact: true }).click();
  const card = dialog.getByRole("button", { name: "暗夜" });
  await expect(card).toBeVisible();

  await card.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("已套用「暗夜」")).toBeVisible();
});

test("toggles the app between light and dark appearance", async ({ page }) => {
  // Headless Chromium defaults to light, so the toggle offers to switch to dark.
  await page.getByRole("button", { name: "切换到暗色" }).click();

  await expect.poll(() =>
    page.evaluate(() => document.documentElement.classList.contains("dark"))
  ).toBe(true);

  // In dark mode the toggle now offers to switch back to light.
  await expect(page.getByRole("button", { name: "切换到亮色" })).toBeVisible();
});

test("collapses a pasted image into a thumbnail and renders it in the preview", async ({ page }) => {
  // Synthesize a paste carrying an image File (same technique the browser uses
  // for a screenshot paste) onto the CodeMirror content element.
  const editor = page.getByRole("textbox", { name: "Markdown 编辑器" });
  await editor.focus();
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#e03131";
    ctx.fillRect(0, 0, 20, 20);
    const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
    const file = new File([blob], "pasted.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const target = document.querySelector<HTMLElement>('.cm-content[aria-label="Markdown 编辑器"]')!;
    target.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
    );
  });

  // The giant base64 is collapsed to a compact card widget — the raw data URL
  // must never bleed into the editor's visible text.
  await expect(page.locator(".cm-mdimg-card")).toBeVisible();
  await expect(page.locator(".cm-content")).not.toContainText("base64");

  // The embedded image still renders in the preview iframe.
  await expect.poll(async () => {
    try {
      const src = await page
        .frameLocator('iframe[title="预览"]')
        .locator("img")
        .first()
        .getAttribute("src");
      return typeof src === "string" && src.startsWith("data:image/");
    } catch {
      return false;
    }
  }).toBe(true);

  // The 公众号 caveat is surfaced so users know to swap in 公众号 CDN URLs.
  await expect(page.getByText("仅预览用")).toBeVisible();
});

test("copies the inlined styled HTML for direct 公众号 paste", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async (items: Array<{ getType: (t: string) => Promise<Blob> }>) => {
          const item = items[0];
          const blob = item ? await item.getType("text/html") : null;
          const text = blob ? await blob.text() : "";
          (window as Window & { __copiedHtml?: string }).__copiedHtml = text;
        },
      },
    });
  });
  await page.reload();

  await page.getByRole("button", { name: "复制 HTML" }).click();

  // The copied payload is the inlined HTML: scoped under .mdcss, with each
  // element carrying its own inline style (so 公众号 paste keeps the styles).
  await expect.poll(() => page.evaluate(() => (window as Window & { __copiedHtml?: string }).__copiedHtml ?? ""))
    .toContain('class="mdcss"');
  const copied = await page.evaluate(() => (window as Window & { __copiedHtml?: string }).__copiedHtml ?? "");
  expect(copied).toContain('class="mdcss"');
  expect(copied).toMatch(/style="/);
});
