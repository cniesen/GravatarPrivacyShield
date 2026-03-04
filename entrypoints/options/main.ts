import { storage } from '#imports';
import { ExtensionSettings } from "../../utils/types";

function fileToDataURL(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function renderEmailUploads(
  emails: string[],
  perEmailImages: Record<string, string>
) {
  const container = document.getElementById("emailUploads")!;
  container.innerHTML = "";

  emails.forEach(email => {
    const safeId = email.replace(/[^a-z0-9]/gi, "_");
    const div = document.createElement("div");
    div.className = "email-block";

    div.innerHTML = `
      <label><strong>${email}</strong></label><br>
      <input type="file" id="img-${safeId}" accept="image/*"><br>
      ${
        perEmailImages[email]
          ? `<img src="${perEmailImages[email]}" class="preview">`
          : ""
      }
      <hr>
    `;

    container.appendChild(div);
  });
}

function restore(): void {
  chrome.storage.sync.get(
    {
      mode: "randomize",
      scope: "all",
      emails: [],
      defaultPlaceholder: null,
      perEmailImages: {}
    },
    (data: ExtensionSettings) => {
      (document.querySelector(
        `input[name="mode"][value="${data.mode}"]`
      ) as HTMLInputElement).checked = true;

      (document.querySelector(
        `input[name="scope"][value="${data.scope}"]`
      ) as HTMLInputElement).checked = true;

      const textarea = document.getElementById(
        "emailList"
      ) as HTMLTextAreaElement;
      textarea.value = data.emails.join("\n");

      renderEmailUploads(data.emails, data.perEmailImages);
    }
  );
}

async function save(): Promise<void> {
  const mode = (
    document.querySelector("input[name='mode']:checked") as HTMLInputElement
  ).value as "randomize" | "block";

  const scope = (
    document.querySelector("input[name='scope']:checked") as HTMLInputElement
  ).value as "all" | "emails";

  const emails = (document.getElementById("emailList") as HTMLTextAreaElement)
    .value.split("\n")
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  const defaultFile = (document.getElementById(
    "defaultPlaceholder"
  ) as HTMLInputElement).files?.[0];

  const defaultPlaceholder = defaultFile
    ? await fileToDataURL(defaultFile)
    : null;

  const perEmailImages: Record<string, string> = {};

  for (const email of emails) {
    const safeId = email.replace(/[^a-z0-9]/gi, "_");
    const input = document.getElementById(
      `img-${safeId}`
    ) as HTMLInputElement | null;
    if (input?.files?.[0]) {
      perEmailImages[email] = await fileToDataURL(input.files[0]);
    }
  }

  chrome.storage.sync.set(
    { mode, scope, emails, defaultPlaceholder, perEmailImages },
    () => {
      const status = document.getElementById("status")!;
      status.textContent = "Saved!";
      setTimeout(() => (status.textContent = ""), 1500);
    }
  );
}

export default defineUnlistedScript(() => {
  console.log(">>check point 1");
  document.addEventListener("DOMContentLoaded", restore);

  document.getElementById("optionsForm")!.addEventListener("submit", () => {
      console.log(">>check point 2");
    void save();
  });

  document.getElementById("emailList")!.addEventListener("input", () => {
    const emails = (document.getElementById("emailList") as HTMLTextAreaElement)
      .value.split("\n")
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    renderEmailUploads(emails, {});
  });
});
