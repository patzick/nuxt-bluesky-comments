import { describe, expect, it, vi } from "vitest";

// We mock @atproto/api typeguards so we can feed minimal objects into processReplies
vi.mock("@atproto/api", () => {
  return {
    AppBskyFeedDefs: {
      isThreadViewPost: (v: unknown): v is { post: unknown; replies?: unknown[] } => {
        return typeof v === "object" && v !== null && "post" in v;
      },
    },
  };
});

import {
  parseBlueskyUrl,
  processReplies,
  uriToUrl,
} from "../src/runtime/composables/blueskyComments.logic";

type MinimalPost = {
  cid: string;
  uri: string;
  author: { did: string; handle: string; displayName?: string; avatar?: string };
  record?: { text?: string; createdAt?: string };
  indexedAt: string;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
};

type MinimalThreadViewPost = {
  post: MinimalPost;
  replies?: MinimalThreadViewPost[];
};

function tvp(
  did: string,
  cid: string,
  opts?: Partial<{
    text: string;
    like: number;
    reply: number;
    repost: number;
    replies: MinimalThreadViewPost[];
  }>,
): MinimalThreadViewPost {
  return {
    post: {
      cid,
      uri: `at://${did}/app.bsky.feed.post/${cid}`,
      author: { did, handle: `${did}.handle` },
      record: { text: opts?.text ?? "", createdAt: "2020-01-01T00:00:00.000Z" },
      indexedAt: "2020-01-01T00:00:00.000Z",
      likeCount: opts?.like ?? 0,
      replyCount: opts?.reply ?? 0,
      repostCount: opts?.repost ?? 0,
    },
    replies: opts?.replies,
  };
}

describe("blueskyComments.logic", () => {
  it("parseBlueskyUrl: parses valid post URLs", () => {
    expect(parseBlueskyUrl("https://bsky.app/profile/foo.bsky.social/post/abc123")).toEqual({
      identifier: "foo.bsky.social",
      rkey: "abc123",
    });
  });

  it("parseBlueskyUrl: returns null for invalid URLs", () => {
    expect(parseBlueskyUrl("https://example.com/x")).toBeNull();
  });

  it("uriToUrl: converts AT URI to web URL", () => {
    expect(uriToUrl("at://did:plc:abc/app.bsky.feed.post/xyz")).toBe(
      "https://bsky.app/profile/did:plc:abc/post/xyz",
    );
    expect(uriToUrl("at://did:plc:abc/app.bsky.feed.post/xyz", "handle.test")).toBe(
      "https://bsky.app/profile/handle.test/post/xyz",
    );
  });

  it("processReplies: sorts siblings by engagement (likes + replies) desc", () => {
    const a = tvp("did:a", "a", { like: 1, reply: 1 }); // 2
    const b = tvp("did:b", "b", { like: 5, reply: 0 }); // 5
    const c = tvp("did:c", "c", { like: 0, reply: 3 }); // 3

    const out = processReplies(
      [a, b, c] as unknown as Parameters<typeof processReplies>[0],
      "did:root",
      0,
    );
    expect(out.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("processReplies: when enabled, promotes same-author continuations to same level (no wrapping)", () => {
    // Parent author is did:p
    // did:a replies (a1), then a1 has a reply by did:a (a2) and a2 has a reply by did:a (a3).
    // With flatten enabled, a3 becomes a sibling of a2 (both under a1), not nested inside a2.
    const a3 = tvp("did:a", "a3", { like: 100, reply: 0 });
    const b1 = tvp("did:b", "b1", { like: 1, reply: 0 });
    const a2 = tvp("did:a", "a2", { replies: [a3, b1] });
    const a1 = tvp("did:a", "a1", { replies: [a2] });

    const out = processReplies(
      [a1] as unknown as Parameters<typeof processReplies>[0],
      "did:p",
      0,
      { flattenSameAuthorThreads: true },
    );

    // a2 and a3 are promoted to the same level as a1 (siblings), not wrapped inside a1/a2.
    expect(out.map((x) => x.id)).toEqual(["a1", "a2", "a3"]);
    expect(out[0]?.replies).toEqual([]);
    expect(out[1]?.replies.map((r) => r.id)).toEqual(["b1"]);
    expect(out[2]?.replies).toEqual([]);
  });

  it("processReplies: when disabled, keeps same-author continuations nested", () => {
    const a3 = tvp("did:a", "a3", { like: 100, reply: 0 });
    const b1 = tvp("did:b", "b1", { like: 1, reply: 0 });
    const a2 = tvp("did:a", "a2", { replies: [a3, b1] });
    const a1 = tvp("did:a", "a1", { replies: [a2] });

    const out = processReplies(
      [a1] as unknown as Parameters<typeof processReplies>[0],
      "did:p",
      0,
      { flattenSameAuthorThreads: false },
    );

    expect(out).toHaveLength(1);
    expect(out[0]?.replies.map((r) => r.id)).toEqual(["a2"]);
    // Sorted by engagement: a3 (100) then b1 (1)
    expect(out[0]?.replies[0]?.replies.map((r) => r.id)).toEqual(["a3", "b1"]);
  });
});
