<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "#imports";
import type { PlaygroundSettingsPayload } from "./components/PlaygroundSettings.vue";

const route = useRoute();
const router = useRouter();

// Theme
const isDark = ref(false);

const themeClass = computed(() => isDark.value
  ? 'bg-neutral-950 text-white dark'
  : 'bg-neutral-50 text-neutral-900'
);

function toggleTheme() {
  isDark.value = !isDark.value;
}

// Sync dark mode with html class for global styling and UnoCSS dark: support
watch(isDark, (val) => {
  if (typeof document !== 'undefined') {
    if (val) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}, { immediate: true });

onMounted(() => {
  // Check system preference if no preference is set (optional, but good for UX)
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && !route.query.theme) {
    // isDark.value = true;
  }
});

// Settings panel
const showSettings = ref(false);
const settings = ref<PlaygroundSettingsPayload>({
  fontFamily: '"Roboto", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial',
  flattenSameAuthorThreads: true,
  bskyStyle: {},
});

function onSettingsUpdate(payload: PlaygroundSettingsPayload) {
  settings.value = payload;
}

const appStyle = computed<Record<string, string>>(() => ({
  fontFamily: settings.value.fontFamily,
}));

// Sample posts
const samplePosts = [
  {
    url: "https://bsky.app/profile/did:plc:vjug55kidv6sye7ykr5faxxn/post/3lbqta5lnck2i",
    note: "Emily Liu - Bluesky comments",
  },
  {
    url: "https://bsky.app/profile/danabra.mov/post/3lzqs3jmttc2a",
    note: "Dan Abramov - explaining ATproto",
  },
  {
    url: "https://bsky.app/profile/bsky.app/post/3l6oveex3ii2l",
    note: "Bluesky - Welcome to Bluesky post",
  },
];

// Initialize from query param or first sample
const postUrl = ref((route.query.url as string) || samplePosts[0].url);

// Watch for changes and update query param
function updateUrl(newUrl: string) {
  postUrl.value = newUrl;
  router.replace({
    query: newUrl ? { url: newUrl } : {},
  });
}

// Handle input changes
function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  updateUrl(target.value);
}

// Clear input
function clearUrl() {
  updateUrl("");
}

// Load a sample post
function loadSample(url: string) {
  updateUrl(url);
}
</script>

<template>
  <div class="min-h-screen transition-colors duration-300" :class="themeClass" :style="appStyle">
    <!-- Settings Panel -->
    <PlaygroundSettings
      v-if="showSettings"
      :is-dark="isDark"
      @update="onSettingsUpdate"
      @close="showSettings = false"
    />

    <div
      class="max-w-2xl mx-auto px-5 py-12"
      :style="showSettings ? { paddingTop: 'calc(33.333333vh + 3rem)' } : {}"
    >
      <!-- Header -->
      <header class="flex items-center justify-between mb-10">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2.5">
            <svg class="w-7 h-7 text-sky-500" viewBox="0 0 568 501" fill="currentColor">
              <path
                d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 57.9464C568 75.2916 558.055 203.659 552.222 224.501C531.947 296.954 458.067 315.434 392.347 304.249C507.222 323.8 536.444 388.56 473.333 453.32C353.473 576.312 301.061 422.461 287.631 383.039C285.169 375.812 284.017 372.431 284 375.306C283.983 372.431 282.831 375.812 280.369 383.039C266.939 422.461 214.527 576.312 94.6667 453.32C31.5556 388.56 60.7778 323.8 175.653 304.249C109.933 315.434 36.0535 296.954 15.7778 224.501C9.94525 203.659 0 75.2916 0 57.9464C0 -28.9064 76.1345 -1.61183 123.121 33.6637Z"
              />
            </svg>
            <span class="text-lg font-bold tracking-tight"
              >Bluesky Comments <span class="text-sky-500 font-medium">Nuxt module</span></span
            >
          </div>
          <p class="text-xs font-medium" :class="isDark ? 'text-white/50' : 'text-neutral-500'">
            Created by
            <a
              href="https://github.com/patzick"
              target="_blank"
              class="transition-colors underline decoration-sky-500/30 underline-offset-2"
              :class="isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'"
              >Patryk Tomczyk</a
            >
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Settings Toggle -->
          <button
            @click="showSettings = !showSettings"
            class="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer border"
            :class="showSettings
              ? 'bg-sky-500 border-sky-500 text-white'
              : (isDark ? 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20' : 'bg-white border-neutral-200 text-sky-900/60 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50')"
            :title="showSettings ? 'Close settings' : 'Open settings'"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer border"
            :class="isDark
              ? 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20'
              : 'bg-white border-neutral-200 text-sky-900/60 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50'"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <svg
              v-if="isDark"
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
            <svg
              v-else
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
              />
            </svg>
          </button>
        </div>
      </header>

      <!-- URL Input -->
      <div class="mb-6">
        <p class="text-sm mb-3" :class="isDark ? 'text-white/60' : 'text-neutral-600'">
          Paste any <span class="font-medium text-sky-500">Bluesky post URL</span> below to see its
          comments in real-time.
        </p>
        <div
          class="flex items-center gap-2 px-4 h-12 rounded-xl border transition-all duration-200"
          :class="isDark
          ? 'bg-white/[0.03] border-white/10 focus-within:border-sky-500/50 focus-within:bg-white/[0.06]'
          : 'bg-white border-neutral-200 focus-within:border-sky-500 shadow-sm'"
        >
          <svg
            class="w-4 h-4 shrink-0"
            :class="isDark ? 'text-white/20' : 'text-neutral-400'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
          <input
            type="url"
            :value="postUrl"
            placeholder="Paste a bsky.app post URL..."
            class="flex-1 bg-transparent outline-none text-sm"
            :class="isDark ? 'text-white placeholder-white/20' : 'text-neutral-900 placeholder-neutral-400'"
            @input="onInput"
          />
          <button
            v-if="postUrl"
            @click="clearUrl"
            class="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer border"
            :class="isDark
              ? 'text-sky-300/50 bg-sky-400/5 border-sky-400/10 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20'
              : 'text-sky-950/40 bg-sky-50 border-sky-100 hover:text-red-600 hover:bg-red-50 hover:border-red-200'"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Sample Posts -->
      <div class="mb-10">
        <p class="text-xs mb-3" :class="isDark ? 'text-white/40' : 'text-neutral-500'">
          Sample posts
        </p>
        <div class="flex flex-col gap-2">
          <div
            v-for="sample in samplePosts"
            :key="sample.url"
            class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all duration-200 border"
            :class="[
              isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-neutral-200 shadow-sm',
              postUrl === sample.url
                ? (isDark ? 'ring-1 ring-sky-500/50 bg-white/[0.05] border-sky-500/20' : 'ring-1 ring-sky-500 bg-sky-50/50')
                : ''
            ]"
          >
            <span class="text-sm truncate" :class="isDark ? 'text-white/70' : 'text-neutral-600'">
              {{ sample.note }}
            </span>
            <button
              @click="loadSample(sample.url)"
              class="shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer"
              :class="postUrl === sample.url
                ? 'bg-sky-500 text-white'
                : (isDark ? 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5' : 'bg-white border border-neutral-200 text-sky-900/60 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50')"
            >
              {{ postUrl === sample.url ? 'Active' : 'Load' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Comments Section -->
      <!-- <div v-if="postUrl"> -->
      <BlueskyComments
        :key="postUrl"
        :url="postUrl"
        :flatten-same-author-threads="settings.flattenSameAuthorThreads"
        :class="isDark ? 'dark-theme' : 'light-theme'"
        :style="settings.bskyStyle"
      />
      <!-- </div> -->

      <!-- Empty State -->
      <!-- <div v-else class="py-16 text-center rounded-xl border-2 border-dashed"
        :class="isDark ? 'border-white/10' : 'border-neutral-200'">
        <svg class="w-10 h-10 mx-auto mb-3" :class="isDark ? 'text-white/20' : 'text-neutral-300'" fill="none"
          stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-sm" :class="isDark ? 'text-white/40' : 'text-neutral-500'">
          Paste a post URL to see comments
        </p>
      </div> -->
    </div>
  </div>
</template>

<style>
/* Ensure the background covers the entire page including overscroll areas */
html,
body {
  margin: 0;
  padding: 0;
  transition: background-color 0.3s ease;
}

html.dark,
body.dark {
  background-color: #0a0a0a;
  /* Matches bg-neutral-950 */
}

html:not(.dark),
body:not(.dark) {
  background-color: #fafafa;
  /* Matches bg-neutral-50 */
}

/* Font family declarations to enable @nuxt/fonts auto-loading */
.font-barlow {
  font-family: 'Barlow', sans-serif;
}

.font-inter {
  font-family: 'Inter', sans-serif;
}

.font-ibm-plex-sans {
  font-family: 'IBM Plex Sans', sans-serif;
}

.font-roboto {
  font-family: 'Roboto', sans-serif;
}

.font-open-sans {
  font-family: 'Open Sans', sans-serif;
}

.font-montserrat {
  font-family: 'Montserrat', sans-serif;
}

.font-lato {
  font-family: 'Lato', sans-serif;
}

.dark-theme {
  --bsky-bg: #0a0a0a;
  --bsky-border: rgba(255, 255, 255, 0.1);
  --bsky-link: #38bdf8;
}

.light-theme {
  --bsky-bg: #fafafa;
  --bsky-border: #e5e5e5;
  --bsky-link: #0284c7;
}
</style>
