import type { FirecrawlFormatKey, FirecrawlScrapeOptions } from "./firecrawl";
import { DEFAULT_FORMAT_KEYS, formatKeysToSpecs } from "./firecrawl";
import { Storage } from "@plasmohq/storage";
import * as R from "remeda";

const storage = new Storage({ area: "local" });

export const API_KEY_STORAGE_KEY = "firecrawl/api-key";
export const PREFS_STORAGE_KEY = "firecrawl/preferences";

export type StoredPreferences = {
  formats?: FirecrawlFormatKey[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
};

export const getStoredApiKey = async (): Promise<string | undefined> => {
  const value = await storage.get<string>(API_KEY_STORAGE_KEY);
  return R.isString(value) && value.trim().length > 0 ? value : undefined;
};

export const setStoredApiKey = async (value: string) => {
  const sanitized = value.trim();
  if (sanitized.length === 0) {
    await storage.remove(API_KEY_STORAGE_KEY);
    return;
  }
  await storage.set(API_KEY_STORAGE_KEY, sanitized);
};

export const getStoredPreferences = async (): Promise<StoredPreferences | undefined> => {
  const value = await storage.get<StoredPreferences>(PREFS_STORAGE_KEY);
  if (!value) {
    return undefined;
  }

  return R.pickBy(value, (option) => option !== undefined);
};

export const setStoredPreferences = async (prefs: StoredPreferences) => {
  await storage.set(
    PREFS_STORAGE_KEY,
    R.pickBy(prefs, (option) => option !== undefined),
  );
};

export const preferencesToScrapeOptions = (prefs?: StoredPreferences): FirecrawlScrapeOptions => {
  if (!prefs) {
    return {
      formats: formatKeysToSpecs(DEFAULT_FORMAT_KEYS),
    };
  }

  const formats = prefs.formats?.length
    ? formatKeysToSpecs(prefs.formats)
    : formatKeysToSpecs(DEFAULT_FORMAT_KEYS);

  return R.pipe(
    {
      formats,
      onlyMainContent: prefs.onlyMainContent,
      includeTags: prefs.includeTags,
      excludeTags: prefs.excludeTags,
    },
    (value) => R.pickBy(value, (entry) => entry !== undefined),
  ) as FirecrawlScrapeOptions;
};
