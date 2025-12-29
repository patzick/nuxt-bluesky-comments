import { ref, computed } from "vue";
import * as AtProtoAPI from "@atproto/api";
import type { FlattenedComment, PostStats, BlueskyCommentsResult, ThreadViewPost } from "../types";

const { AtpAgent, AppBskyFeedDefs } = AtProtoAPI;
import {
  parseBlueskyUrl,
  processReplies,
  uriToUrl,
  type ProcessRepliesOptions,
} from "./blueskyComments.logic";

const agent = new AtpAgent({
  service: "https://public.api.bsky.app",
});

/**
 * Composable to fetch and manage Bluesky comments
 */
export function useBlueskyComments(
  uriOrUrl: string,
  options: Pick<ProcessRepliesOptions, "flattenSameAuthorThreads"> = {},
): BlueskyCommentsResult {
  const loading = ref(true);
  const error = ref<string | null>(null);
  const post = ref<AtProtoAPI.AppBskyFeedDefs.PostView | null>(null);
  const comments = ref<FlattenedComment[]>([]);
  const stats = ref<PostStats>({
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    quoteCount: 0,
  });
  const postUrl = ref("");

  async function resolveUri(input: string): Promise<string> {
    // Already an AT URI
    if (input.startsWith("at://")) {
      return input;
    }

    // Parse Bluesky URL
    const parsed = parseBlueskyUrl(input);
    if (!parsed) {
      throw new Error("Invalid Bluesky URL format");
    }

    const { identifier, rkey } = parsed;

    // If it's already a DID, use it directly
    if (identifier.startsWith("did:")) {
      return `at://${identifier}/app.bsky.feed.post/${rkey}`;
    }

    // Resolve handle to DID
    const { data } = await agent.resolveHandle({ handle: identifier });
    return `at://${data.did}/app.bsky.feed.post/${rkey}`;
  }

  async function fetchComments() {
    loading.value = true;
    error.value = null;

    try {
      const uri = await resolveUri(uriOrUrl);

      // Fetch the full thread with maximum depth
      const response = await agent.getPostThread({
        uri,
        depth: 1000, // Fetch full depth
        parentHeight: 0, // We don't need parent context
      });

      if (!response.success) {
        throw new Error(`Failed to fetch post: ${uri}`);
      }

      const { data } = response;

      if (!AppBskyFeedDefs.isThreadViewPost(data.thread)) {
        // Check if it's a blocked or not found post
        if (AppBskyFeedDefs.isBlockedPost(data.thread)) {
          throw new Error("This post is from a blocked account");
        }
        if (AppBskyFeedDefs.isNotFoundPost(data.thread)) {
          throw new Error(`Post not found: ${uri}`);
        }
        throw new Error("Post not found or not accessible");
      }

      const thread = data.thread as ThreadViewPost;
      post.value = thread.post;

      // Set stats
      stats.value = {
        likeCount: thread.post.likeCount || 0,
        repostCount: thread.post.repostCount || 0,
        replyCount: thread.post.replyCount || 0,
        quoteCount: (thread.post as { quoteCount?: number }).quoteCount || 0,
      };

      // Set post URL
      postUrl.value = uriToUrl(uri, thread.post.author.handle);

      // Process replies
      comments.value = processReplies(thread.replies, thread.post.author.did, 0, options);
    } catch (e) {
      error.value =
        e instanceof Error
          ? `Failed to load comments from ${uriOrUrl}: ${e.message}`
          : "Failed to load comments";
    } finally {
      loading.value = false;
    }
  }

  // Fetch on creation
  fetchComments();

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    post: computed(() => post.value),
    comments: computed(() => comments.value),
    stats: computed(() => stats.value),
    postUrl: computed(() => postUrl.value),
    refresh: fetchComments,
  };
}
