import type { AppBskyFeedDefs, AppBskyFeedPost, AppBskyActorDefs } from "@atproto/api";
import type { ComputedRef, Ref } from "vue";

/**
 * Module configuration options
 */
export interface ModuleOptions {
  /**
   * Default Bluesky API service URL
   * @default 'https://public.api.bsky.app'
   */
  apiService?: string;
}

/**
 * Props for the BlueskyComments component
 */
export interface BlueskyCommentsProps {
  /**
   * AT Protocol URI of the post (e.g., at://did:plc:.../app.bsky.feed.post/...)
   */
  uri?: string;
  /**
   * Bluesky web URL of the post (e.g., https://bsky.app/profile/user.bsky.social/post/abc123)
   * Will be converted to URI internally
   */
  url?: string;
  /**
   * Maximum number of top-level comments to show initially
   * @default 5
   */
  limit?: number;
  /**
   * Render same-author continuation replies at the same level (no nested wrapping).
   * @default true
   */
  flattenSameAuthorThreads?: boolean;
}

/**
 * Represents a flattened comment for display
 */
export interface FlattenedComment {
  /** Unique comment ID (CID) */
  id: string;
  /** AT Protocol URI of the comment */
  uri: string;
  /** Author information */
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  /** Comment text content */
  text: string;
  /** Timestamp when the comment was created */
  createdAt: string;
  /** Number of likes */
  likeCount: number;
  /** Number of replies */
  replyCount: number;
  /** Number of reposts */
  repostCount: number;
  /** Nesting depth level (0 = top level reply to main post) */
  depth: number;
  /** Child comments (flattened for same-author threads) */
  replies: FlattenedComment[];
  /** Parent comment author DID (for flattening logic) */
  parentAuthorDid?: string;
}

/**
 * Post engagement statistics
 */
export interface PostStats {
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
}

/**
 * Result from useBlueskyComments composable
 */
export type MaybeRef<T> = Ref<T> | ComputedRef<T>;

export interface BlueskyCommentsResult {
  /** Loading state */
  loading: MaybeRef<boolean>;
  /** Error message if any */
  error: MaybeRef<string | null>;
  /** The main post data */
  post: MaybeRef<AppBskyFeedDefs.PostView | null>;
  /** Flattened and processed comments */
  comments: MaybeRef<FlattenedComment[]>;
  /** Post engagement stats */
  stats: MaybeRef<PostStats>;
  /** URL to the post on Bluesky */
  postUrl: MaybeRef<string>;
  /** Refresh comments */
  refresh: () => Promise<void>;
}

/**
 * Re-export useful types from @atproto/api
 */
export type ThreadViewPost = AppBskyFeedDefs.ThreadViewPost;
export type PostView = AppBskyFeedDefs.PostView;
export type PostRecord = AppBskyFeedPost.Record;
export type ProfileViewBasic = AppBskyActorDefs.ProfileViewBasic;
