<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

type FontPresetId = "barlow" | "inter" | "ibmPlexSans" | "roboto" | "openSans" | "montserrat" | "lato" | "system";

type BskyVars = {
  "--bsky-bg": string;
  "--bsky-border": string;
  "--bsky-link": string;
};

type BskyVarKey = keyof BskyVars;

export type PlaygroundSettingsPayload = {
  fontFamily: string;
  flattenSameAuthorThreads: boolean;
  bskyStyle: Record<string, string>;
};

const props = defineProps<{
  isDark?: boolean;
}>();

const emit = defineEmits<{
  (e: "update", payload: PlaygroundSettingsPayload): void;
  (e: "close"): void;
}>();

// Detect dark mode - prefer prop, fallback to DOM check
const isDark = computed(() => {
  if (props.isDark !== undefined) return props.isDark;
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
});

function fontFamilyForPreset(preset: FontPresetId): string {
  switch (preset) {
    case "barlow":
      return '"Barlow", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    case "inter":
      return '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    case "ibmPlexSans":
      return '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    case "roboto":
      return '"Roboto", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial';
    case "openSans":
      return '"Open Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    case "montserrat":
      return '"Montserrat", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    case "lato":
      return '"Lato", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    case "system":
      return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
  }
}

function defaultsForTheme(dark: boolean): BskyVars {
  return dark
    ? {
      "--bsky-bg": "#0a0a0a",
      "--bsky-border": "rgba(255, 255, 255, 0.1)",
      "--bsky-link": "#38bdf8",
    }
    : {
      "--bsky-bg": "#fafafa",
      "--bsky-border": "#e5e5e5",
      "--bsky-link": "#0284c7",
    };
}

const fontPreset = ref<FontPresetId>("roboto");
const flattenSameAuthorThreads = ref(true);
const syncVarsWithTheme = ref(true);
const bskyVars = reactive<BskyVars>(defaultsForTheme(isDark.value));

watch(
  isDark,
  (dark) => {
    if (syncVarsWithTheme.value) {
      Object.assign(bskyVars, defaultsForTheme(dark));
    }
  }
);

function resetVarsToThemeDefaults() {
  Object.assign(bskyVars, defaultsForTheme(isDark.value));
}

const fontFamily = computed(() => fontFamilyForPreset(fontPreset.value));
const bskyStyle = computed<Record<string, string>>(() => ({ ...bskyVars }));

watch(
  [fontFamily, flattenSameAuthorThreads, bskyStyle],
  () => {
    emit("update", {
      fontFamily: fontFamily.value,
      flattenSameAuthorThreads: flattenSameAuthorThreads.value,
      bskyStyle: bskyStyle.value,
    });
  },
  { immediate: true }
);

type ParsedCssColor = {
  hex: `#${string}`;
  alpha: number;
  isRgba: boolean;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function pad2(s: string): string {
  return s.length === 1 ? `0${s}` : s;
}

function toHexByte(n: number): string {
  return pad2(Math.round(Math.min(255, Math.max(0, n))).toString(16));
}

function rgbToHex(r: number, g: number, b: number): `#${string}` {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const full =
    raw.length === 3 ? raw.split("").map((c) => `${c}${c}`).join("") : raw;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return { r, g, b };
}

function parseCssColor(value: string): ParsedCssColor | null {
  const v = value.trim().toLowerCase();
  if (v.startsWith("#")) {
    const rgb = hexToRgb(v);
    if (!rgb) return null;
    return { hex: rgbToHex(rgb.r, rgb.g, rgb.b), alpha: 1, isRgba: false };
  }

  const rgbaMatch = v.match(
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|0?\.\d+|1(\.0+)?)\s*\)$/
  );
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const a = clamp01(Number(rgbaMatch[4]));
    return { hex: rgbToHex(r, g, b), alpha: a, isRgba: true };
  }

  const rgbMatch = v.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
  );
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return { hex: rgbToHex(r, g, b), alpha: 1, isRgba: false };
  }

  return null;
}

function formatRgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = clamp01(alpha);
  const roundedAlpha = Math.round(a * 100) / 100;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${roundedAlpha})`;
}

function shouldShowAlphaControl(value: string): boolean {
  const parsed = parseCssColor(value);
  if (!parsed) return false;
  return value.trim().toLowerCase().startsWith("rgba") || parsed.alpha < 1;
}

function pickerHexFor(key: BskyVarKey): `#${string}` {
  return parseCssColor(bskyVars[key])?.hex ?? "#000000";
}

function alphaFor(key: BskyVarKey): number {
  return parseCssColor(bskyVars[key])?.alpha ?? 1;
}

function setHex(key: BskyVarKey, hex: string) {
  const parsed = parseCssColor(bskyVars[key]);
  const keepAlpha = parsed?.isRgba ?? false;
  bskyVars[key] = keepAlpha ? formatRgbaFromHex(hex, parsed?.alpha ?? 1) : hex;
}

function setAlpha(key: BskyVarKey, alpha: number) {
  const parsed = parseCssColor(bskyVars[key]);
  const baseHex = parsed?.hex ?? "#000000";
  bskyVars[key] = formatRgbaFromHex(baseHex, alpha);
}

const bskyVarEntries = computed(() => {
  return Object.entries(bskyVars) as Array<[BskyVarKey, string]>;
});
</script>

<template>
  <div
    class="settings-panel bg-white border-neutral-200 dark:bg-neutral-900 dark:border-white/10"
    :class="{ 'dark': isDark }"
  >
    <div class="settings-header">
      <div>
        <h3 class="settings-title">Playground Settings</h3>
        <p class="settings-subtitle">Customize fonts, component props, and CSS variables</p>
      </div>
      <button @click="$emit('close')" class="close-button" title="Close settings">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <label class="settings-label">Font</label>
        <select
          v-model="fontPreset"
          class="settings-select border-neutral-200 text-neutral-800 dark:border-white/10 dark:text-white/80"
        >
          <option value="barlow">Barlow</option>
          <option value="inter">Inter</option>
          <option value="ibmPlexSans">IBM Plex Sans</option>
          <option value="roboto">Roboto</option>
          <option value="openSans">Open Sans</option>
          <option value="montserrat">Montserrat</option>
          <option value="lato">Lato</option>
          <option value="system">System</option>
        </select>
      </div>

      <div class="settings-section">
        <label class="settings-label">Options</label>
        <div class="settings-options">
          <label class="settings-checkbox">
            <input v-model="flattenSameAuthorThreads" type="checkbox" class="mr-2" />
            Flatten same-author threads
          </label>
          <label class="settings-checkbox">
            <input v-model="syncVarsWithTheme" type="checkbox" class="mr-2" />
            Sync vars with theme
          </label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-vars-header">
          <label class="settings-label">CSS Variables</label>
          <button @click="resetVarsToThemeDefaults" class="settings-reset">Reset</button>
        </div>
        <div class="settings-vars-grid">
          <div v-for="[key, value] in bskyVarEntries" :key="key" class="settings-var">
            <label class="settings-var-label">{{ key }}</label>
            <div class="settings-var-controls">
              <input
                type="color"
                class="settings-color-picker border-neutral-200 dark:border-white/10"
                :value="pickerHexFor(key)"
                @input="(e: Event) => setHex(key, (e.target as HTMLInputElement).value)"
              />
              <input
                :value="value"
                class="settings-var-input border-neutral-200 text-neutral-800 dark:border-white/10 dark:text-white/80"
                @input="(e: Event) => { bskyVars[key] = (e.target as HTMLInputElement).value }"
              />
            </div>
            <div v-if="shouldShowAlphaControl(value)" class="settings-alpha">
              <span class="settings-alpha-label">Opacity</span>
              <input
                type="range"
                min="0"
                max="100"
                :value="Math.round(alphaFor(key) * 100)"
                class="settings-alpha-slider"
                @input="(e: Event) => setAlpha(key, Number((e.target as HTMLInputElement).value) / 100)"
              />
              <span class="settings-alpha-value"> {{ Math.round(alphaFor(key) * 100) }}% </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Settings panel styles */
.settings-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 33.333333vh;
  z-index: 1000;
  border-bottom-width: 1px;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom-width: 1px;
  border-color: inherit;
  flex-shrink: 0;
}

.settings-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: inherit;
}

.settings-subtitle {
  font-size: 0.75rem;
  margin-top: 0.125rem;
  opacity: 0.6;
}

.close-button {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  transition: all 0.2s;
  cursor: pointer;
  color: #0c4a6e;
  opacity: 0.4;
  background-color: #f0f9ff;
  border: 1px solid #e0f2fe;
}

.close-button:hover {
  opacity: 1;
  color: #ef4444;
  background-color: #fef2f2;
  border-color: #fecaca;
}

.dark .close-button {
  color: #7dd3fc;
  opacity: 0.5;
  background-color: rgba(56, 189, 248, 0.05);
  border-color: rgba(56, 189, 248, 0.1);
}

.dark .close-button:hover {
  opacity: 1;
  color: #f87171;
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

.settings-section {
  margin-bottom: 1.25rem;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.settings-select {
  width: 100%;
  height: 2.75rem;
  border-radius: 0.75rem;
  border: 2px solid #e5e5e5;
  padding: 0 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: white;
  outline: none;
  transition: all 0.2s;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23737373' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
}

.settings-select:focus {
  border-color: #0284c7;
}

.dark .settings-select {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a3a3a3' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
}

.dark .settings-select:focus {
  border-color: #38bdf8;
}

.settings-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-checkbox {
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background-color: #f5f5f5;
  transition: all 0.2s;
  border: 1px solid #e5e5e5;
}

.settings-checkbox:hover {
  background-color: #f0f9ff;
  border-color: #0284c7;
  color: #0284c7;
}

.dark .settings-checkbox {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: #a3a3a3;
}

.dark .settings-checkbox:hover {
  background-color: rgba(56, 189, 248, 0.1);
  border-color: #38bdf8;
  color: #38bdf8;
}

.settings-checkbox input {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 0.375rem;
  border: 2px solid #d4d4d4;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: white;
  margin-right: 0.75rem;
}

.settings-checkbox input:checked {
  background-color: #0284c7;
  border-color: #0284c7;
}

.settings-checkbox input:checked::after {
  content: "";
  position: absolute;
  top: 1px;
  left: 4px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.dark .settings-checkbox input {
  background: #171717;
  border-color: #404040;
}

.dark .settings-checkbox input:checked {
  background-color: #38bdf8;
  border-color: #38bdf8;
}

.settings-vars-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.settings-reset {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  transition: all 0.2s;
  cursor: pointer;
  background-color: #0284c7;
  color: white;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.settings-reset:hover {
  background-color: #0369a1;
}

.dark .settings-reset {
  background-color: #38bdf8;
  color: #0c4a6e;
}

.dark .settings-reset:hover {
  background-color: #7dd3fc;
}


.settings-vars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.settings-var {
  display: flex;
  flex-direction: column;
}

.settings-var-label {
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.settings-var-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.settings-color-picker {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  border: 2px solid #e5e5e5;
  padding: 0.375rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-color-picker:hover {
  border-color: #0284c7;
}

.dark .settings-color-picker {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .settings-color-picker:hover {
  border-color: #38bdf8;
}

.settings-var-input {
  flex: 1;
  height: 2.75rem;
  border-radius: 0.75rem;
  border: 2px solid #e5e5e5;
  padding: 0 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: white;
  outline: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  transition: all 0.2s;
}

.settings-var-input:focus {
  border-color: #0284c7;
}

.dark .settings-var-input {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.dark .settings-var-input:focus {
  border-color: #38bdf8;
}

.settings-alpha {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.settings-alpha-label {
  font-size: 0.6875rem;
  opacity: 0.6;
  min-width: 3rem;
}

.settings-alpha-slider {
  flex: 1;
  height: 0.5rem;
  border-radius: 1rem;
  background: #e5e5e5;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
}

.settings-alpha-slider::-webkit-slider-thumb {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: #0284c7;
  cursor: pointer;
  border: 3px solid white;
  transition: all 0.2s;
}

.settings-alpha-slider::-webkit-slider-thumb:hover {
  background: #0369a1;
}

.dark .settings-alpha-slider {
  background: rgba(255, 255, 255, 0.1);
}

.dark .settings-alpha-slider::-webkit-slider-thumb {
  background: #38bdf8;
  border-color: #171717;
}

.dark .settings-alpha-slider::-webkit-slider-thumb:hover {
  background: #7dd3fc;
}

.settings-alpha-value {
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  width: 2.5rem;
  text-align: right;
  opacity: 0.7;
}
</style>
