import { ExtensionSettings } from "./types";

function randomHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function md5(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

let settings: ExtensionSettings = {
  mode: "randomize",
  scope: "all",
  emails: [],
  emailHashes: [],
  defaultPlaceholder: null,
  perEmailImages: {}
};

async function loadSettings(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.sync.get(
      {
        mode: "randomize",
        scope: "all",
        emails: [],
        defaultPlaceholder: null,
        perEmailImages: {}
      },
      async data => {
        settings.mode = data.mode;
        settings.scope = data.scope;
        settings.emails = data.emails;
        settings.defaultPlaceholder = data.defaultPlaceholder;
        settings.perEmailImages = data.perEmailImages;

        settings.emailHashes = await Promise.all(
          data.emails.map((email: string) => md5(email.trim().toLowerCase()))
        );

        resolve();
      }
    );
  });
}

function extractRequestedSize(url: URL): number | null {
  const size = url.searchParams.get("s");
  return size ? parseInt(size, 10) : null;
}

async function buildPlaceholderDataUrl(
  mime: string,
  size: number | null,
  customImage?: string
): Promise<string> {
  if (customImage) return customImage;

  const px = size ?? 80;
  const canvas = new OffscreenCanvas(px, px);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ccc";
  ctx.fillRect(0, 0, px, px);

  const blob = await canvas.convertToBlob({ type: mime });
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  return `data:${mime};base64,${base64}`;
}

export default defineBackground(() => {
  loadSettings();
  chrome.storage.onChanged.addListener(loadSettings);

  chrome.webRequest.onBeforeRequest.addListener(
    details => {
      const url = new URL(details.url);

      const match = url.pathname.match(
        /^\/avatar\/([a-fA-F0-9]+)(\.[a-zA-Z0-9]+)?$/
      );
      if (!match) return;

      const originalHash = match[1].toLowerCase();
      const extension = match[2] ?? "";
      const mime =
        extension === ".png"
          ? "image/png"
          : extension === ".webp"
          ? "image/webp"
          : "image/jpeg";

      const size = extractRequestedSize(url);

      let applies = false;

      if (settings.scope === "all") {
        applies = true;
      } else if (settings.scope === "emails") {
        applies = settings.emailHashes.includes(originalHash);
      }

      if (!applies) return;

      if (settings.mode === "randomize") {
        const newHash = randomHash();
        const newUrl = `${url.origin}/avatar/${newHash}${extension}${url.search}`;
        return { redirectUrl: newUrl };
      }

      if (settings.mode === "block") {
        return (async () => {
          let customImage: string | undefined;

          if (settings.scope === "emails") {
            const idx = settings.emailHashes.indexOf(originalHash);
            if (idx !== -1) {
              const email = settings.emails[idx];
              customImage = settings.perEmailImages[email];
            }
          }

          const placeholder = await buildPlaceholderDataUrl(
            mime,
            size,
            customImage ?? settings.defaultPlaceholder ?? undefined
          );

          return { redirectUrl: placeholder };
        })();
      }
    },
    {
      urls: [
        "https://gravatar.com/avatar/*",
        "https://www.gravatar.com/avatar/*"
      ]
    },
    ["blocking"]
  );
});
