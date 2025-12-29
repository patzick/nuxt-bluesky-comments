import { AppBskyFeedDefs } from "@atproto/api";
import type { FlattenedComment, PostRecord } from "../types";

/**
 * Parse a Bluesky web URL into handle/DID and rkey.
 */
export function parseBlueskyUrl(url: string): { identifier: string; rkey: string } | null {
  const match = url.match(/https?:\/\/bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/);
  if (!match) return null;

  const [, identifier, rkey] = match;
  return { identifier, rkey };
}

/**
 * Convert an AT Protocol URI to a Bluesky web URL.
 */
export function uriToUrl(uri: string, handle?: string): string {
  const match = uri.match(/at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)/);
  if (!match) return "";

  const [, did, rkey] = match;
  const identifier = handle || did;
  return `https://bsky.app/profile/${identifier}/post/${rkey}`;
}

/**
 * Process thread replies into flattened comments.
 * Handles same-author consecutive reply flattening and engagement sorting.
 */
export type ProcessRepliesOptions = {
  /**
   * When true, same-author continuation replies are promoted to the same level as their parent comment
   * (so they don't render as nested wrappers).
   * @default true
   */
  flattenSameAuthorThreads?: boolean;
};

export function processReplies(
  replies: AppBskyFeedDefs.ThreadViewPost["replies"],
  parentAuthorDid?: string,
  depth: number = 0,
  options: ProcessRepliesOptions = {},
): FlattenedComment[] {
  if (!replies || replies.length === 0) return [];

  const flattenSameAuthorThreads = options.flattenSameAuthorThreads ?? true;

  const groups: Array<{
    head: FlattenedComment;
    continuations: FlattenedComment[];
  }> = [];

  for (const reply of replies) {
    // Skip blocked or not found posts
    if (!AppBskyFeedDefs.isThreadViewPost(reply)) continue;

    const post = reply.post;
    const author = post.author;
    const record = post.record as PostRecord;

    // Check if this is a same-author continuation
    const isSameAuthor = parentAuthorDid === author.did;

    const comment: FlattenedComment = {
      id: post.cid,
      uri: post.uri,
      author: {
        did: author.did,
        handle: author.handle,
        displayName: author.displayName,
        avatar: author.avatar,
      },
      text: record?.text || "",
      createdAt: record?.createdAt || post.indexedAt,
      likeCount: post.likeCount || 0,
      replyCount: post.replyCount || 0,
      repostCount: post.repostCount || 0,
      depth: isSameAuthor ? depth : depth,
      replies: [],
      parentAuthorDid,
    };

    // Process nested replies
    if (reply.replies && reply.replies.length > 0) {
      const nestedReplies = processReplies(reply.replies, author.did, depth + 1, options);

      if (flattenSameAuthorThreads) {
        // Promote same-author continuations to this level (as siblings of `comment`)
        const continuations: FlattenedComment[] = [];
        const nestedUnderComment: FlattenedComment[] = [];

        for (const nestedReply of nestedReplies) {
          if (nestedReply.author.did === author.did) {
            continuations.push({
              ...nestedReply,
              depth: depth,
              // Preserve "continuation" semantics for avatar/indent logic
              parentAuthorDid: author.did,
            });
          } else {
            nestedUnderComment.push(nestedReply);
          }
        }

        comment.replies = nestedUnderComment;
        groups.push({ head: comment, continuations });
        continue;
      }

      comment.replies = nestedReplies;
    }

    groups.push({ head: comment, continuations: [] });
  }

  // Sort by engagement (likes + replies) descending, while keeping continuation groups together
  groups.sort((a, b) => {
    const scoreA = a.head.likeCount + a.head.replyCount;
    const scoreB = b.head.likeCount + b.head.replyCount;
    return scoreB - scoreA;
  });

  return groups.flatMap((g) => [g.head, ...g.continuations]);
}
