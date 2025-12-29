import { defineNuxtModule, addComponentsDir, addImports, createResolver } from "@nuxt/kit";
import type { ModuleOptions } from "./runtime/types";

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-bluesky-comments",
    configKey: "blueskyComments",
    compatibility: {
      nuxt: ">=3.0.0",
    },
  },
  defaults: {
    apiService: "https://public.api.bsky.app",
  },
  async setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Register components
    addComponentsDir({
      path: resolver.resolve("./runtime/components"),
      pathPrefix: false,
      prefix: "",
      global: true,
    });

    // Register composables
    addImports({
      name: "useBlueskyComments",
      as: "useBlueskyComments",
      from: resolver.resolve("./runtime/composables/useBlueskyComments"),
    });

    // Ensure @atproto/api is transpiled
    nuxt.options.build.transpile.push("@atproto/api");
  },
});

// Export types
export type { ModuleOptions } from "./runtime/types";
