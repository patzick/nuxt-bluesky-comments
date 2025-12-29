import { describe, expect, it, vi } from "vitest";

const kitMocks = vi.hoisted(() => {
  return {
    addComponentsDir: vi.fn(),
    addImports: vi.fn(),
    createResolver: vi.fn(() => ({
      resolve: (p: string) => p,
    })),
  };
});

vi.mock("@nuxt/kit", () => {
  return {
    defineNuxtModule: <T>(def: T) => def,
    addComponentsDir: kitMocks.addComponentsDir,
    addImports: kitMocks.addImports,
    createResolver: kitMocks.createResolver,
  };
});

import moduleDef from "../src/module";

type NuxtMock = {
  options: {
    build: {
      transpile: string[];
    };
  };
};

describe("nuxt module wiring", () => {
  it("registers components dir + composable import and transpiles @atproto/api", async () => {
    const nuxt: NuxtMock = { options: { build: { transpile: [] } } };

    // moduleDef is the object returned by defineNuxtModule (mocked to identity)
    // @ts-expect-error: runtime module definition shape
    await moduleDef.setup({}, nuxt);

    expect(kitMocks.createResolver).toHaveBeenCalledTimes(1);
    expect(kitMocks.addComponentsDir).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "./runtime/components",
        global: true,
      }),
    );
    expect(kitMocks.addImports).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "useBlueskyComments",
        from: "./runtime/composables/useBlueskyComments",
      }),
    );
    expect(nuxt.options.build.transpile).toContain("@atproto/api");
  });
});
