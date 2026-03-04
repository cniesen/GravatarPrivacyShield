export interface ExtensionSettings {
  mode: "randomize" | "block";
  scope: "all" | "emails";
  emails: string[];
  emailHashes: string[];
  defaultPlaceholder: string | null;
  perEmailImages: Record<string, string>;
}
