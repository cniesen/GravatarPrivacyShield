import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Gravatar Privacy Shield",
    default_locale: "en",
    permissions: ["webRequest", "webRequestBlocking", "storage"],
    host_permissions: [
      "https://gravatar.com/*",
      "https://www.gravatar.com/*"
    ],
    browser_specific_settings: {
      'gecko': {
        'id': "@gravatarprivacyshield.cniesen",
        // @ts-expect-error - data_collection_permissions not yet in WXT types
        data_collection_permissions: {
          required: ['none']
        }                
      }
    },    
    options_ui: {
      page: "options.html",
      open_in_tab: false
    }
  },
  zip: {
        excludeSources: [
            "gimp_assets/**",
            "img/**"
        ]
    }
});
