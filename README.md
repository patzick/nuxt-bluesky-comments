# nuxt-bluesky-comments

[![npm version](https://img.shields.io/npm/v/nuxt-bluesky-comments.svg)](https://www.npmjs.com/package/nuxt-bluesky-comments)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Nuxt module to display Bluesky post comments on your website. Perfect for adding a comments section to your blog powered by Bluesky discussions.

**[Live Demo](https://nuxt-bluesky-comments.patzick.workers.dev)** - Try it out with real Bluesky posts!

## Features

- 🦋 Display comments from any public Bluesky post
- 🎨 Customizable via CSS variables
- 🌙 Dark mode support
- 🧵 Smart thread flattening for same-author replies
- 📊 Engagement stats (likes, reposts, replies)
- ♾️ Full thread depth support
- 📱 Responsive design
- 🖼️ Avatar fallback with author initials

## Quick Start

```bash
pnpm add nuxt-bluesky-comments
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-bluesky-comments'],
});
```

```vue
<BlueskyComments url="https://bsky.app/profile/user.bsky.social/post/abc123" />
```

## Installation

```bash
# pnpm
pnpm add nuxt-bluesky-comments

# npm
npm install nuxt-bluesky-comments

# yarn
yarn add nuxt-bluesky-comments
```

## Props

| Prop                       | Type      | Default | Description                                       |
| -------------------------- | --------- | ------- | ------------------------------------------------- |
| `url`                      | `string`  | -       | Bluesky web URL of the post                       |
| `uri`                      | `string`  | -       | AT Protocol URI (alternative to url)              |
| `limit`                    | `number`  | `5`     | Top-level comments shown initially                |
| `flattenSameAuthorThreads` | `boolean` | `true`  | Keep consecutive same-author replies at one level |

## Composable

For custom implementations:

```vue
<script setup>
const { loading, error, comments, stats, postUrl, refresh } = useBlueskyComments(
  'https://bsky.app/profile/user.bsky.social/post/abc123'
);
</script>
```

**Returns:** `loading`, `error`, `comments`, `stats`, `postUrl`, `refresh()`

## Styling

### CSS Variables

Text colors inherit from your page automatically. Configure these variables:

| Variable        | Description                   | Light     | Dark                    |
| --------------- | ----------------------------- | --------- | ----------------------- |
| `--bsky-bg`     | Background (for thread lines) | `#ffffff` | `#0a0a0a`               |
| `--bsky-border` | Border/divider color          | `#e5e5e5` | `rgba(255,255,255,0.1)` |
| `--bsky-link`   | Link color                    | `#2563eb` | `#38bdf8`               |

> **Important:** `--bsky-bg` must match your page background for thread lines to render correctly.

### Example

```css
/* Light theme */
.bluesky-comments-wrapper {
  --bsky-bg: #ffffff;
  --bsky-border: #e5e7eb;
  --bsky-link: #2563eb;
}

/* Dark theme */
.dark .bluesky-comments-wrapper {
  --bsky-bg: #0a0a0a;
  --bsky-border: rgba(255, 255, 255, 0.1);
  --bsky-link: #38bdf8;
}
```

### Inline Styles

```vue
<BlueskyComments
  url="https://bsky.app/profile/user.bsky.social/post/abc123"
  :style="{
    '--bsky-bg': '#fafafa',
    '--bsky-border': '#e5e5e5',
    '--bsky-link': '#0284c7',
  }"
/>
```

## Thread Flattening

Consecutive replies from the same author stay at one visual level:

```
UserA: "Great post!"
  └─ UserB: "Thanks!"
  └─ UserB: "Also wanted to add..."   ← Same level, not nested deeper
  └─ UserB: "One more thing..."
```

## Blog Integration with [nuxt-content](https://content.nuxt.com/)

Add `blueskyUrl` to your frontmatter:

```markdown
---
title: My Blog Post
blueskyUrl: https://bsky.app/profile/user.bsky.social/post/abc123
---
```

```vue
<template>
  <article>
    <ContentRenderer :value="page" />
    <BlueskyComments v-if="page.blueskyUrl" :url="page.blueskyUrl" />
  </article>
</template>
```

## Development

```bash
pnpm install       # Install dependencies
pnpm dev:prepare   # Prepare development
pnpm dev           # Run playground
pnpm prepack       # Build module
```

## Credits

Inspired by Emily Liu's blog post [Using Bluesky posts as blog comments](https://emilyliu.me/blog/comments) — the idea that Bluesky's open network could power comment sections across the web.

## License

MIT License © Patryk Tomczyk
