import type {
  AtpAgent as AtpAgentType,
  AppBskyFeedDefs as AppBskyFeedDefsType,
} from "@atproto/api";

const ESM_SH_URL = "https://esm.sh/@atproto/api@0.18.8";

type AtProtoModule = {
  AtpAgent: typeof AtpAgentType;
  AppBskyFeedDefs: typeof AppBskyFeedDefsType;
};

let cachedModule: AtProtoModule | null = null;

/**
 * Dynamically load @atproto/api from esm.sh
 * This avoids bundling the large package and loads it on-demand
 */
export async function loadAtproto(): Promise<AtProtoModule> {
  if (cachedModule) {
    return cachedModule;
  }

  const mod = await import(/* @vite-ignore */ ESM_SH_URL);
  cachedModule = mod as AtProtoModule;
  return cachedModule;
}

let agentInstance: AtpAgentType | null = null;

/**
 * Get or create the shared AtpAgent instance
 */
export async function getAtpAgent(): Promise<AtpAgentType> {
  if (agentInstance) {
    return agentInstance;
  }

  const { AtpAgent } = await loadAtproto();
  agentInstance = new AtpAgent({
    service: "https://public.api.bsky.app",
  });
  return agentInstance;
}
