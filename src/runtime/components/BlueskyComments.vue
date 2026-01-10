<script setup lang="ts">
import { ref, computed } from "vue";
import { useBlueskyComments } from "../composables/useBlueskyComments";
import BlueskyComment from "./BlueskyComment.vue";

const props = withDefaults(
  defineProps<{
    /**
     * AT Protocol URI of the post
     */
    uri?: string;
    /**
     * Bluesky web URL of the post
     */
    url?: string;
    /**
     * Maximum number of top-level comments to show initially
     */
    limit?: number;
    /**
     * Render same-author continuation replies at the same visual level (no nested wrapping).
     */
    flattenSameAuthorThreads?: boolean;
  }>(),
  {
    limit: 5,
    flattenSameAuthorThreads: true,
  },
);

// Determine which identifier to use
const postIdentifier = computed(() => {
  if (props.uri) return props.uri;
  if (props.url) return props.url;
  return "";
});

// Only fetch if we have a valid identifier
const hasIdentifier = computed(() => !!postIdentifier.value);

// Use the composable to fetch comments
const { loading, error, comments, stats, postUrl, refresh } = hasIdentifier.value
  ? useBlueskyComments(postIdentifier.value, {
      flattenSameAuthorThreads: props.flattenSameAuthorThreads,
    })
  : {
      loading: ref(false),
      error: ref("No Bluesky post URL or URI provided"),
      comments: ref([]),
      stats: ref({ likeCount: 0, repostCount: 0, replyCount: 0, quoteCount: 0 }),
      postUrl: ref(""),
      refresh: async () => {},
    };

// Pagination state
const showAll = ref(false);
const visibleComments = computed(() => {
  if (showAll.value) return comments.value;
  return comments.value.slice(0, props.limit);
});

const hasMoreComments = computed(() => {
  return comments.value.length > props.limit && !showAll.value;
});

const remainingCount = computed(() => {
  return comments.value.length - props.limit;
});

function showMoreComments() {
  showAll.value = true;
}

/**
 * Format large numbers (e.g., 1234 -> 1.2K)
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
</script>

<template>
  <div
    class="bsky-comments"
    style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--bsky-border, #e5e5e5)"
  >
    <!-- Stats bar -->
    <a
      v-if="postUrl && stats.likeCount + stats.repostCount + stats.replyCount > 0"
      :href="postUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="bsky-stats-bar"
    >
      <span v-if="stats.likeCount > 0" class="bsky-stat">
        <svg class="bsky-stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {{ formatCount(stats.likeCount) }} {{ stats.likeCount === 1 ? "like" : "likes" }}
      </span>
      <span v-if="stats.repostCount > 0" class="bsky-stat">
        <svg class="bsky-stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {{ formatCount(stats.repostCount) }} {{ stats.repostCount === 1 ? "repost" : "reposts" }}
      </span>
      <span v-if="stats.replyCount > 0" class="bsky-stat">
        <svg class="bsky-stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {{ formatCount(stats.replyCount) }} {{ stats.replyCount === 1 ? "reply" : "replies" }}
      </span>
    </a>

    <!-- Section header -->
    <h2 class="bsky-heading">Comments</h2>

    <!-- CTA to comment -->
    <p class="bsky-cta">
      Reply on Bluesky
      <a v-if="postUrl" :href="postUrl" target="_blank" rel="noopener noreferrer" class="bsky-link"
        >here</a
      >
      to join the conversation.
    </p>

    <!-- Loading state -->
    <div v-if="loading" class="bsky-loading">
      <svg class="bsky-spinner" fill="none" viewBox="0 0 24 24">
        <circle
          style="opacity: 0.25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          style="opacity: 0.75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      Loading comments...
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bsky-state-message">
      <p>{{ error }}</p>
      <button v-if="hasIdentifier" class="bsky-link bsky-button" @click="refresh">Try again</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="comments.length === 0" class="bsky-state-message">
      <p>No comments yet. Be the first to reply!</p>
    </div>

    <!-- Comments list -->
    <div v-else class="bsky-comments-list">
      <BlueskyComment
        v-for="comment in visibleComments"
        :key="comment.id"
        :comment="comment"
        :depth="0"
      />
    </div>

    <!-- Show more button -->
    <div v-if="hasMoreComments" class="bsky-show-more">
      <button class="bsky-link bsky-button" @click="showMoreComments">
        {{ remainingCount }} more {{ remainingCount === 1 ? "comment" : "comments" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.bsky-stats-bar {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  opacity: 0.6;
  margin-bottom: 1rem;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
}

.bsky-stats-bar:hover {
  opacity: 1;
  color: var(--bsky-link, #2563eb);
}

.bsky-stat {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.bsky-stat-icon {
  width: 1rem;
  height: 1rem;
}

.bsky-heading {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: inherit;
}

.bsky-cta {
  font-size: 0.875rem;
  opacity: 0.6;
  margin-bottom: 1.5rem;
}

.bsky-link {
  color: var(--bsky-link, #2563eb);
  text-decoration: none;
}

.bsky-link:hover {
  text-decoration: underline;
}

.bsky-button {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 0.875rem;
  cursor: pointer;
}

.bsky-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  opacity: 0.6;
}

.bsky-spinner {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.5rem;
  animation: bsky-spin 1s linear infinite;
}

@keyframes bsky-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.bsky-state-message {
  padding: 2rem 0;
  text-align: center;
  opacity: 0.6;
}

.bsky-show-more {
  margin-top: 1rem;
}
</style>
