import type { CSSProperties } from "react";
import * as R from "remeda";

import {
  DEFAULT_FORMAT_KEYS,
  type FirecrawlFormatKey,
  type FirecrawlScrapeOptions,
  type ScrapeResponseBody,
  type CrawlStartResponseBody,
  type CrawlStatusResponseBody,
} from "~lib/firecrawl";
import type { StoredPreferences } from "~lib/storage";
import { colors } from "./design";
import type { CrawlFormState, CrawlStartFailure, CrawlStatusFailure, ScrapeFailure } from "./types";

export const AVAILABLE_FORMAT_OPTIONS: ReadonlyArray<{
  key: FirecrawlFormatKey;
  label: string;
  helper: string;
  recommended?: boolean;
}> = [
  {
    key: "markdown",
    label: "Markdown",
    helper: "Clean, readable content ideal for notes",
    recommended: true,
  },
  {
    key: "html",
    label: "HTML",
    helper: "Rendered HTML without Firecrawl cleaning",
  },
  {
    key: "summary",
    label: "Summary",
    helper: "Firecrawl-generated overview",
  },
  {
    key: "links",
    label: "Links",
    helper: "Structured list of discovered links",
  },
  {
    key: "json",
    label: "JSON",
    helper: "Structured JSON payload (default schema)",
  },
];

export const ensurePreferences = (prefs?: StoredPreferences): StoredPreferences => {
  const base = prefs ?? {};
  return {
    formats: base.formats?.length ? [...base.formats] : R.clone(DEFAULT_FORMAT_KEYS),
    onlyMainContent: base.onlyMainContent ?? true,
    includeTags: base.includeTags,
    excludeTags: base.excludeTags,
  };
};

export const ensureFormats = (formats: FirecrawlFormatKey[]): FirecrawlFormatKey[] =>
  formats.length === 0 ? R.clone(DEFAULT_FORMAT_KEYS) : R.unique(formats);

export const computeNextFormats = (
  currentFormats: FirecrawlFormatKey[],
  format: FirecrawlFormatKey,
) =>
  ensureFormats(
    currentFormats.includes(format)
      ? currentFormats.filter((item) => item !== format)
      : [...currentFormats, format],
  );

export const isScrapeFailure = (value: ScrapeResponseBody): value is ScrapeFailure =>
  value.ok === false;

export const isCrawlStartFailure = (value: CrawlStartResponseBody): value is CrawlStartFailure =>
  value.ok === false;

export const isCrawlStatusFailure = (value: CrawlStatusResponseBody): value is CrawlStatusFailure =>
  value.ok === false;

const formatLabelMap = new Map(
  AVAILABLE_FORMAT_OPTIONS.map((format) => [format.key, format.label]),
);

export const formatLabel = (key: FirecrawlFormatKey) =>
  formatLabelMap.get(key) ??
  key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

export const previewSnippet = (content: string, expanded: boolean) => {
  if (expanded) {
    return content;
  }
  return content.length > 400 ? `${content.slice(0, 400)}…` : content;
};

export const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const parseOptionalInteger = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

export const getStatusDotStyle = (status?: string): CSSProperties => {
  const getColor = (s?: string) => {
    if (s === "completed") return colors.success;
    if (s === "processing" || s === "pending") return colors.heat100;
    if (s === "failed") return colors.danger;
    return colors.blackAlpha40;
  };

  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: getColor(status),
    display: "inline-block",
    flexShrink: 0,
  };
};

export const linesToList = (value: string) =>
  value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const buildCrawlOptions = (
  form: CrawlFormState,
  scrapeOptions: FirecrawlScrapeOptions,
): Record<string, unknown> =>
  R.pipe(
    {
      prompt: form.prompt,
      includePaths: linesToList(form.includePaths),
      excludePaths: linesToList(form.excludePaths),
      limit: parseOptionalInteger(form.limit),
      maxDiscoveryDepth: parseOptionalInteger(form.maxDiscoveryDepth),
      delay: parseOptionalNumber(form.delay),
      maxConcurrency: parseOptionalInteger(form.maxConcurrency),
      scrapeOptions,
      sitemap: form.sitemap,
      ignoreQueryParameters: form.ignoreQueryParameters,
      crawlEntireDomain: form.crawlEntireDomain,
      allowExternalLinks: form.allowExternalLinks,
      allowSubdomains: form.allowSubdomains,
    },
    (options) =>
      R.mapValues(options, (value) => {
        if (Array.isArray(value)) {
          return value.length > 0 ? value : undefined;
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed.length > 0 ? trimmed : undefined;
        }
        return value;
      }),
    (options) => R.pickBy(options, (value) => value !== undefined),
  ) as Record<string, unknown>;
