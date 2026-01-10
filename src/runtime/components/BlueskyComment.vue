<script setup lang="ts">
import { ref, computed, provide, inject } from "vue";
import type { FlattenedComment } from "../types";

const props = withDefaults(
  defineProps<{
    comment: FlattenedComment;
    depth?: number;
    parentAuthorDid?: string;
    /**
     * True when this comment is the last *indented* sibling at its depth.
     * Used to visually terminate the parent thread line (so it doesn't look like it continues).
     */
    isLastSibling?: boolean;
  }>(),
  {
    depth: 0,
    isLastSibling: false,
  },
);

// Collapse state
const collapsed = ref(false);

// Avatar error tracking - shows fallback if image fails to load
const avatarError = ref(false);

function handleAvatarError() {
  avatarError.value = true;
}

// Get the first letter of the handle for avatar placeholder
const avatarLetter = computed(() => {
  const handle = props.comment.author.handle || props.comment.author.displayName || "?";
  return handle.charAt(0).toUpperCase();
});

// Same-author detection
const isSameAuthor = computed(() => props.parentAuthorDid === props.comment.author.did);

// Should indent this comment (don't indent if same author as parent)
const shouldIndent = computed(() => props.depth > 0 && !isSameAuthor.value);

const HIDE_GLOBE_FOR_HANDLE_SUFFIXES = [".bsky.social"] as const;

const shouldShowHandleGlobe = computed(() => {
  const handle = props.comment.author.handle?.toLowerCase() ?? "";
  return !HIDE_GLOBE_FOR_HANDLE_SUFFIXES.some((suffix) => handle.endsWith(suffix));
});

// Has replies
const hasReplies = computed(() => props.comment.replies && props.comment.replies.length > 0);

// Is nested comment (has a parent thread)
const isNested = computed(() => props.depth > 0 && shouldIndent.value);

type ReplyRenderItem = {
  reply: FlattenedComment;
  isLastIndentedSibling: boolean;
};

const replyItems = computed<ReplyRenderItem[]>(() => {
  const replies = props.comment.replies || [];
  let lastIndentedIndex = -1;
  for (let i = replies.length - 1; i >= 0; i -= 1) {
    const reply = replies[i];
    // Indentation is driven by same-author detection (see shouldIndent)
    if (reply && reply.author.did !== props.comment.author.did) {
      lastIndentedIndex = i;
      break;
    }
  }

  return replies.map((reply, index) => ({
    reply,
    isLastIndentedSibling:
      index === lastIndentedIndex && reply.author.did !== props.comment.author.did,
  }));
});

// Hover state for main branch line
const isMainBranchHovered = ref(false);

// Inject parent's hover state and toggle function if we're nested
const parentHoverState = inject<{
  isHovered: typeof isMainBranchHovered;
  toggleCollapse: () => void;
} | null>("parentThreadState", null);

// Provide hover state and toggle to children if we have replies
if (hasReplies.value) {
  provide("parentThreadState", {
    isHovered: isMainBranchHovered,
    toggleCollapse,
  });
}

// Computed hover state - true if this branch is hovered or parent branch is hovered
const isConnectedHovered = computed(() => {
  if (isNested.value && parentHoverState) {
    return parentHoverState.isHovered.value;
  }
  return isMainBranchHovered.value;
});

// Count total nested replies for collapsed indicator
function countAllReplies(comment: FlattenedComment): number {
  let count = comment.replies?.length || 0;
  for (const reply of comment.replies || []) {
    count += countAllReplies(reply);
  }
  return count;
}

const totalNestedReplies = computed(() => countAllReplies(props.comment));

// Toggle collapse
function toggleCollapse() {
  collapsed.value = !collapsed.value;
}

// Handle connection line click - same as main thread line
function handleConnectionClick() {
  if (parentHoverState) {
    parentHoverState.toggleCollapse();
  }
}

const shouldCutParentThreadLine = computed(() => {
  // Only relevant for indented children; if this is the last indented sibling at this depth,
  // we mask the parent thread line below the connection point (even if this comment has its own replies).
  // Deeper replies will have their own thread rail; visually the parent's rail shouldn't continue past
  // the last sibling at this depth.
  return isNested.value && props.isLastSibling;
});

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears}y`;
  if (diffMonths > 0) return `${diffMonths}mo`;
  if (diffWeeks > 0) return `${diffWeeks}w`;
  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  if (diffMins > 0) return `${diffMins}m`;
  return "now";
}

/**
 * Build the Bluesky URL for this comment
 */
function getCommentUrl(comment: FlattenedComment): string {
  const match = comment.uri.match(/at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)/);
  if (!match) return "";
  const [, did, rkey] = match;
  const identifier = comment.author.handle || did;
  return `https://bsky.app/profile/${identifier}/post/${rkey}`;
}

const commentUrl = getCommentUrl(props.comment);
const relativeTime = formatRelativeTime(props.comment.createdAt);
</script>

<template>
  <div class="bsky-comment" :class="{ nested: isNested }">
    <!-- Connection line from nested comment to main branch - overlays without causing indentation -->
    <div
      v-if="isNested"
      class="connection-line-wrapper"
      @click="handleConnectionClick"
      @mouseenter="
        () => {
          if (parentHoverState) parentHoverState.isHovered.value = true;
        }
      "
      @mouseleave="
        () => {
          if (parentHoverState) parentHoverState.isHovered.value = false;
        }
      "
    >
      <svg
        class="connection-svg"
        :class="{ hovered: isConnectedHovered }"
        width="100%"
        height="100%"
        viewBox="0 0 29 32"
        preserveAspectRatio="none"
      >
        <!-- Rounded "L" connector (vertical + horizontal) with avatar-like corner radius -->
        <!-- Kept within avatar height (32px) so it never goes above the avatar -->
        <!-- Use a true quarter-circle arc for the elbow (radius = 16px) -->
        <!-- SVG width is tuned so the horizontal segment ends exactly at the avatar's left edge -->
        <!-- Inset by 1px to avoid stroke clipping (keeps thickness consistent with 2px rails) -->
        <path
          d="M 1 1 V 15 A 16 16 0 0 0 17 31"
          fill="none"
          :stroke="isConnectedHovered ? '#2563eb' : '#d1d5db'"
          stroke-width="2"
          stroke-linecap="butt"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <!-- Mask to terminate the parent thread line for the last sibling at this depth -->
    <div v-if="shouldCutParentThreadLine" class="thread-line-cut" aria-hidden="true" />

    <div class="comment-row">
      <!-- Grid column 1: avatar -->
      <div class="avatar-cell">
        <a
          :href="`https://bsky.app/profile/${comment.author.handle}`"
          target="_blank"
          rel="noopener noreferrer"
          class="avatar-link"
        >
          <img
            v-if="comment.author.avatar && !avatarError"
            :src="comment.author.avatar"
            :alt="`${comment.author.displayName || comment.author.handle}'s avatar`"
            class="avatar-img"
            @error="handleAvatarError"
          />
          <div v-else class="avatar-placeholder">
            <span class="avatar-letter">{{ avatarLetter }}</span>
          </div>
        </a>
      </div>

      <!-- Grid column 1: rail spans below avatar -->
      <div v-if="hasReplies" class="thread-line-wrapper" aria-hidden="true">
        <div
          v-if="!collapsed"
          class="thread-line"
          :class="{ hovered: isMainBranchHovered }"
          @click="toggleCollapse"
          @mouseenter="isMainBranchHovered = true"
          @mouseleave="isMainBranchHovered = false"
        />
      </div>

      <!-- Grid column 1: toggle button in the SAME grid row as stats-row -->
      <button
        v-if="hasReplies"
        class="thread-toggle-btn"
        :class="{ collapsed: collapsed }"
        :title="collapsed ? 'Expand replies' : 'Collapse replies'"
        @click="toggleCollapse"
      >
        <svg
          v-if="collapsed"
          class="toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <svg
          v-else
          class="toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
        </svg>
      </button>

      <!-- Grid column 2: author -->
      <div class="author-row">
        <div class="author-meta">
          <a
            :href="`https://bsky.app/profile/${comment.author.handle}`"
            target="_blank"
            rel="noopener noreferrer"
            class="author-name"
          >
            {{ comment.author.displayName || comment.author.handle }}
          </a>
          <div class="author-handle-row">
            <a
              :href="`https://bsky.app/profile/${comment.author.handle}`"
              target="_blank"
              rel="noopener noreferrer"
              class="author-handle"
            >
              @{{ comment.author.handle }}
            </a>
            <a
              v-if="shouldShowHandleGlobe"
              class="author-handle-site"
              :href="`https://${comment.author.handle}`"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Open ${comment.author.handle} website`"
              :title="`Open website of ${comment.author.handle}`"
            >
              <svg
                class="globe-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.6 9h16.8" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.6 15h16.8" />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 3c2.2 2.7 3.5 5.7 3.5 9s-1.3 6.3-3.5 9c-2.2-2.7-3.5-5.7-3.5-9S9.8 5.7 12 3z"
                />
              </svg>
            </a>
          </div>
        </div>
        <a
          :href="commentUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="timestamp"
          :title="new Date(comment.createdAt).toLocaleString()"
        >
          {{ relativeTime }}
        </a>
      </div>

      <!-- Grid column 2: text -->
      <div class="comment-text">
        {{ comment.text }}
      </div>

      <!-- Grid column 2: stats (link to this comment on Bluesky) -->
      <a
        class="stats-row stats-row-link"
        :href="commentUrl"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open this comment on Bluesky to reply"
        title="Open this comment on Bluesky to reply"
      >
        <span class="stat">
          <svg
            class="stat-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ comment.likeCount }}
        </span>
        <span class="stat">
          <svg
            class="stat-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 1l4 4-4 4M21 5H10a4 4 0 00-4 4v1"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M7 23l-4-4 4-4M3 19h11a4 4 0 004-4v-1"
            />
          </svg>
          {{ comment.repostCount }}
        </span>
        <span class="stat">
          <svg
            class="stat-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ comment.replyCount }}
        </span>
        <svg
          class="stats-link-indicator"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 7h7v7" />
        </svg>
      </a>

      <!-- Grid column 2: collapsed indicator -->
      <div v-if="collapsed && hasReplies" class="collapsed-info">
        <button class="collapsed-link" @click="toggleCollapse">
          {{ totalNestedReplies }} more {{ totalNestedReplies === 1 ? "reply" : "replies" }}
        </button>
      </div>

      <!-- Grid column 2: replies -->
      <div v-if="!collapsed && hasReplies" class="replies-list">
        <BlueskyComment
          v-for="item in replyItems"
          :key="item.reply.id"
          :comment="item.reply"
          :depth="depth + 1"
          :parent-author-did="comment.author.did"
          :is-last-sibling="item.isLastIndentedSibling"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bsky-comment {
  padding-top: 8px;
  position: relative;
  /* Shared geometry vars to keep connector + end-of-thread cut aligned when tweaking spacing */
  --bsky-avatar-size: 32px;
  --bsky-avatar-center: 16px;
  /* half of avatar size */
  --bsky-connector-top: 0px;
  /* where the connector box starts inside this comment */
}

.bsky-comment.nested {
  /* Minimal indentation - just enough for connection line */
  /* margin-top: -28px; */
  /* Negative margin to align nested avatar with parent's stats row (heart icon) */
  /* Parent stats row is at: author-row (~20px) + comment-text (varies) + margin-top (6px) = ~26px+ */
  /* Avatar center is 16px from top, so we need to move nested comment up to align */
  padding-top: 12px;
  /* Padding to position avatar at correct vertical level - aligned with parent heart icon */
}

.bsky-comment.nested .comment-row {
  margin-left: -9px;
}

.comment-row {
  display: grid;
  grid-template-columns: 32px 1fr;
  column-gap: 10px;
  grid-template-rows: auto auto auto auto auto;
  align-items: start;
}

.avatar-cell {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  justify-content: center;
}

.author-row {
  grid-column: 2;
  grid-row: 1;
}

.comment-text {
  grid-column: 2;
  grid-row: 2;
}

.stats-row {
  grid-column: 2;
  grid-row: 3;
}

.collapsed-info {
  grid-column: 2;
  grid-row: 4;
}

.replies-list {
  grid-column: 2;
  grid-row: 5;
}

.avatar-link {
  display: block;
  flex-shrink: 0;
  color: inherit;
  text-decoration: none;
}

.avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bsky-border, #e5e5e5);
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bsky-border, #e5e5e5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-letter {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
  line-height: 1;
  text-transform: uppercase;
}

/* Thread line wrapper - positions button */
.thread-line-wrapper {
  grid-column: 1;
  grid-row: 2 / 6;
  display: flex;
  justify-content: center;
  margin-top: 4px;
  align-self: stretch;
}

/* Thread line (full height) */
.thread-line {
  width: 2px;
  height: 100%;
  min-height: 20px;
  background: #d1d5db;
  border-radius: 1px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.thread-line:hover,
.thread-line.hovered {
  background: #2563eb;
}

/* Connection line wrapper - positions the entire connection path */
.connection-line-wrapper {
  position: absolute;
  left: -27px;
  /* Position: nested comment left edge is at 20px, main branch center is at 16px */
  /* So go back 4px from nested comment left edge to align wrapper left with main branch */
  top: var(--bsky-connector-top);
  /* Align wrapper top with avatar top */
  width: 29px;
  /* End at avatar center (25px to avatar-left-edge + 16px to avatar-center - 12px nested shift) */
  height: var(--bsky-avatar-size);
  /* Constrain connector to avatar height so it doesn't go above it */
  z-index: 1;
  /* Above background but below content */
  pointer-events: all;
  cursor: pointer;
  overflow: visible;
}

/* Mask the parent vertical thread line below the connection point for last siblings */
.thread-line-cut {
  position: absolute;
  left: -25px;
  transform: translateX(-50%);
  /* Start cutting at the avatar center / connector attach height */
  top: calc(var(--bsky-connector-top) + var(--bsky-avatar-center));
  bottom: 0;
  width: 14px;
  background: var(--bsky-bg, #ffffff);
  z-index: 0;
  border-radius: 999px;
  pointer-events: none;
}

/* SVG connection path with curved corner */
.connection-svg {
  width: 100%;
  height: 100%;
  pointer-events: all;
  transition: opacity 0.15s;
  display: block;
  overflow: visible;
}

.connection-svg path {
  transition: stroke 0.15s;
}

/* Toggle button - positioned to align with stats row */
/* Stats row is approximately: author-row (20px) + comment-text (varies) + margin (4px + 6px) */
/* We position at top: 48px to align roughly with stats row */
.thread-toggle-btn {
  grid-column: 1;
  grid-row: 3;
  justify-self: center;
  align-self: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  isolation: isolate;
  background: transparent;
  border: 1px solid var(--bsky-toggle-border, rgba(17, 24, 39, 0.18));
  cursor: pointer;
  transition: all 0.15s;
  color: var(--bsky-toggle-icon, #111827);
  z-index: 2;
  /* Stronger separation + background-colored "cutout" ring to hide rail and improve visibility */
  box-shadow:
    0 0 0 2px var(--bsky-bg, #ffffff),
    0 2px 8px rgba(0, 0, 0, 0.18);
}

.thread-toggle-btn::before {
  /* Opaque mask: hides the thread rail beneath even if surface is translucent */
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--bsky-bg, #ffffff);
  z-index: -2;
  pointer-events: none;
}

.thread-toggle-btn::after {
  /* Translucent surface: keeps a "transparent" feel without revealing the rail */
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--bsky-toggle-surface, rgba(229, 231, 235, 0.85));
  z-index: -1;
  pointer-events: none;
}

.thread-toggle-btn:hover {
  --bsky-toggle-surface: rgba(37, 99, 235, 0.95);
  --bsky-toggle-border: rgba(255, 255, 255, 0.85);
  --bsky-toggle-icon: #ffffff;
}

.thread-toggle-btn.collapsed {
  --bsky-toggle-surface: rgba(219, 234, 254, 0.75);
  --bsky-toggle-border: rgba(37, 99, 235, 0.28);
  --bsky-toggle-icon: #2563eb;
}

.thread-toggle-btn.collapsed:hover {
  --bsky-toggle-surface: rgba(37, 99, 235, 0.95);
  --bsky-toggle-border: rgba(255, 255, 255, 0.85);
  --bsky-toggle-icon: #ffffff;
}

.toggle-icon {
  width: 14px;
  height: 14px;
}

.content-column {
  flex: 1;
  min-width: 0;
}

.author-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
  line-height: 20px;
}

.author-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.author-name {
  font-weight: 500;
  color: inherit;
}

.author-name:hover {
  text-decoration: underline;
}

.author-handle {
  font-size: 12px;
  line-height: 14px;
  color: inherit;
  opacity: 0.6;
  text-decoration: none;
}

.author-handle-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-handle-site {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  opacity: 0.5;
  text-decoration: none;
}

.author-handle-site:hover {
  color: var(--bsky-link, #2563eb);
}

.globe-icon {
  width: 12px;
  height: 12px;
}

.author-handle:hover {
  text-decoration: underline;
  color: var(--bsky-link, #2563eb);
}

.timestamp {
  color: inherit;
  opacity: 0.6;
}

.timestamp:hover {
  text-decoration: underline;
  color: var(--bsky-link, #2563eb);
}

.comment-text {
  margin-top: 4px;
  font-size: 14px;
  line-height: 20px;
  color: inherit;
  opacity: 0.85;
  white-space: pre-wrap;
  word-break: break-word;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: inherit;
  opacity: 0.6;
  min-height: 18px;
}

.stats-row-link {
  text-decoration: none;
}

.stats-row-link:hover {
  color: var(--bsky-link, #2563eb);
}

.stats-link-indicator {
  width: 14px;
  height: 14px;
  margin-left: 2px;
  opacity: 0.65;
}

.stats-row-link:hover .stats-link-indicator {
  opacity: 1;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  width: 14px;
  height: 14px;
}

.collapsed-info {
  margin-top: 4px;
}

.collapsed-link {
  font-size: 12px;
  color: var(--bsky-link, #2563eb);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.collapsed-link:hover {
  text-decoration: underline;
}

.replies-list {
  margin-top: 0;
}

/* Dark mode */
/* Avatar backgrounds now use --bsky-border variable - no dark mode overrides needed */

:root.dark .thread-toggle-btn,
.dark .thread-toggle-btn,
.dark-theme .thread-toggle-btn {
  --bsky-toggle-surface: rgba(55, 65, 81, 0.82);
  --bsky-toggle-border: rgba(255, 255, 255, 0.14);
  --bsky-toggle-icon: #e5e7eb;
}

:root.dark .thread-toggle-btn:hover,
.dark .thread-toggle-btn:hover,
.dark-theme .thread-toggle-btn:hover {
  --bsky-toggle-surface: rgba(59, 130, 246, 0.95);
  --bsky-toggle-border: rgba(255, 255, 255, 0.85);
  --bsky-toggle-icon: #ffffff;
}

:root.dark .thread-toggle-btn.collapsed,
.dark .thread-toggle-btn.collapsed,
.dark-theme .thread-toggle-btn.collapsed {
  --bsky-toggle-surface: rgba(30, 58, 95, 0.75);
  --bsky-toggle-border: rgba(96, 165, 250, 0.35);
  --bsky-toggle-icon: #60a5fa;
}

:root.dark .thread-line,
.dark .thread-line,
.dark-theme .thread-line {
  background: #4b5563;
}

:root.dark .thread-line:hover,
.dark .thread-line:hover,
.dark-theme .thread-line:hover,
:root.dark .thread-line.hovered,
.dark .thread-line.hovered,
.dark-theme .thread-line.hovered {
  background: #3b82f6;
}

:root.dark .connection-line,
.dark .connection-line,
.dark-theme .connection-line {
  background: #4b5563;
}

:root.dark .connection-line:hover,
.dark .connection-line:hover,
.dark-theme .connection-line:hover,
:root.dark .connection-line.hovered,
.dark .connection-line.hovered,
.dark-theme .connection-line.hovered {
  background: #3b82f6;
}

/* Dark mode for connection SVG */
:root.dark .connection-svg path,
.dark .connection-svg path,
.dark-theme .connection-svg path {
  stroke: #4b5563;
}

:root.dark .connection-svg.hovered path,
.dark .connection-svg.hovered path,
.dark-theme .connection-svg.hovered path {
  stroke: #3b82f6;
}
</style>
