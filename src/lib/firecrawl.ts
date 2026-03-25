import type { PlasmoMessaging } from "@plasmohq/messaging";
import * as R from "remeda";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";

export type FirecrawlFormatKey = "markdown" | "links" | "html" | "rawHtml" | "summary" | "json";

export type FirecrawlFormatPrimitive = Exclude<FirecrawlFormatKey, "json">;

export type FirecrawlJsonFormat = {
  type: "json";
  prompt?: string;
  schema?: unknown;
};

export type FirecrawlFormatSpec = FirecrawlFormatPrimitive | FirecrawlJsonFormat;

export const formatKeyToSpec = (key: FirecrawlFormatKey): FirecrawlFormatSpec =>
  key === "json" ? { type: "json" } : key;

export const formatKeysToSpecs = (keys: FirecrawlFormatKey[]): FirecrawlFormatSpec[] =>
  keys.map(formatKeyToSpec);

export type FirecrawlScrapeOptions = {
  formats?: FirecrawlFormatSpec[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  maxAge?: number;
  waitFor?: number;
  timeout?: number;
  actions?: unknown[];
  headers?: Record<string, string>;
  mobile?: boolean;
  removeBase64Images?: boolean;
  blockAds?: boolean;
  storeInCache?: boolean;
};

export type FirecrawlScrapeRequestPayload = {
  url: string;
} & FirecrawlScrapeOptions;

export type FirecrawlScrapeSuccessPayload = {
  success: true;
  data: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    summary?: string;
    links?: unknown;
    [key: string]: unknown;
  };
};

export type FirecrawlScrapeFailurePayload = {
  success: false;
  error?: string;
  message?: string;
};

export type FirecrawlScrapePayload = FirecrawlScrapeSuccessPayload | FirecrawlScrapeFailurePayload;

export type FirecrawlCrawlStartResponse = {
  id?: string;
  success?: boolean;
  error?: string;
  message?: string;
};

export type FirecrawlCrawlStatus = {
  success: boolean;
  status?: "pending" | "processing" | "completed" | "failed";
  total?: number;
  completed?: number;
  data?: unknown;
  error?: string;
  message?: string;
  next?: string;
};

export type ScrapeRequestBody = {
  url: string;
  options?: FirecrawlScrapeOptions;
  apiKey?: string;
};

export type ScrapeResponseBody =
  | {
      ok: true;
      mimeType: "text/markdown" | "application/json" | "text/html" | "text/plain";
      primary: string;
      primaryFormat: FirecrawlFormatKey;
      raw: FirecrawlScrapePayload;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      raw?: FirecrawlScrapePayload;
    };

export type CrawlStartRequestBody = {
  url: string;
  options?: Record<string, unknown>;
  apiKey?: string;
};

export type CrawlStartResponseBody =
  | {
      ok: true;
      id: string;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      raw?: FirecrawlCrawlStartResponse;
    };

export type CrawlStatusRequestBody = {
  id: string;
  apiKey?: string;
};

export type CrawlStatusResponseBody =
  | {
      ok: true;
      status: FirecrawlCrawlStatus["status"];
      payload: FirecrawlCrawlStatus;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      payload?: FirecrawlCrawlStatus;
    };

export type CreditUsageResponse = {
  success: boolean;
  data?: {
    remainingCredits: number;
    planCredits: number;
    billingPeriodStart: string | null;
    billingPeriodEnd: string | null;
  };
  error?: string;
};

export type FirecrawlMessageHandler<Req, Res> = PlasmoMessaging.MessageHandler<Req, Res>;

export const DEFAULT_FORMAT_KEYS: FirecrawlFormatKey[] = ["markdown"];

const defaultFormats: FirecrawlFormatSpec[] = formatKeysToSpecs(DEFAULT_FORMAT_KEYS);

const formatSpecToKey = (spec: FirecrawlFormatSpec): FirecrawlFormatKey =>
  typeof spec === "string" ? spec : spec.type;

const isSuccessful = (payload: FirecrawlScrapePayload): payload is FirecrawlScrapeSuccessPayload =>
  payload?.success === true;

const safeJson = async <T>(response: Response): Promise<T | undefined> => {
  try {
    return (await response.json()) as T;
  } catch (error) {
    console.warn("Failed to parse response JSON", error);
    return undefined;
  }
};

export type FirecrawlRequestConfig = {
  apiKey: string;
  path: string;
  init?: RequestInit;
};

const requestFirecrawl = async <T>({
  apiKey,
  path,
  init,
}: FirecrawlRequestConfig): Promise<{
  data?: T;
  status: number;
}> => {
  const response = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
  });

  const data = await safeJson<T>(response);

  return {
    data,
    status: response.status,
  };
};

export const performScrape = async (
  apiKey: string,
  payload: FirecrawlScrapeRequestPayload,
): Promise<{
  result: ScrapeResponseBody;
  status: number;
}> => {
  const sanitizedPayload = R.pickBy(payload, (value) => value !== undefined);

  const { data, status } = await requestFirecrawl<FirecrawlScrapePayload>({
    apiKey,
    path: "/scrape",
    init: {
      method: "POST",
      body: JSON.stringify({
        ...sanitizedPayload,
        formats: payload.formats?.length ? payload.formats : defaultFormats,
      }),
    },
  });

  if (!data) {
    return {
      result: {
        ok: false,
        error: "Empty Firecrawl response",
        status,
      },
      status,
    };
  }

  if (!isSuccessful(data)) {
    const error = data.error ?? data.message ?? "Firecrawl scrape failed";
    return {
      result: {
        ok: false,
        error,
        status,
        raw: data,
      },
      status,
    };
  }

  const formats = payload.formats ?? defaultFormats;

  const primaryFormatSpec =
    R.find(formats, (format) => {
      if (typeof format === "string") {
        return format === "markdown";
      }
      return format.type === "json";
    }) ??
    formats[0] ??
    "markdown";

  const primaryFormatKey = formatSpecToKey(primaryFormatSpec);

  const primaryCandidate = (() => {
    if (typeof primaryFormatSpec === "string") {
      switch (primaryFormatSpec) {
        case "markdown":
          return data.data.markdown;
        case "html":
          return data.data.html;
        case "rawHtml":
          return data.data.rawHtml;
        case "summary":
          return data.data.summary;
        case "links":
          return JSON.stringify(data.data.links ?? [], null, 2);
        default:
          return undefined;
      }
    }

    if (primaryFormatSpec.type === "json") {
      const jsonPayload = data.data.json ?? data.data.data ?? data.data;
      return JSON.stringify(jsonPayload, null, 2);
    }

    return undefined;
  })();

  if (typeof primaryCandidate !== "string") {
    return {
      result: {
        ok: false,
        error: "Unable to resolve scrape content",
        status,
        raw: data,
      },
      status,
    };
  }

  const mimeType = (() => {
    if (typeof primaryFormatSpec === "string") {
      switch (primaryFormatSpec) {
        case "markdown":
          return "text/markdown";
        case "html":
        case "rawHtml":
          return "text/html";
        case "summary":
          return "text/plain";
        case "links":
          return "application/json";
        default:
          return "text/plain";
      }
    }
    if (primaryFormatSpec.type === "json") {
      return "application/json";
    }
    return "text/plain";
  })();

  return {
    result: {
      ok: true,
      mimeType,
      primary: primaryCandidate,
      primaryFormat: primaryFormatKey,
      raw: data,
    },
    status,
  };
};

export const performCrawlStart = async (
  apiKey: string,
  payload: CrawlStartRequestBody,
): Promise<{
  result: CrawlStartResponseBody;
  status: number;
}> => {
  const sanitizedPayload = R.pickBy(payload.options ?? {}, (value) => value !== undefined);

  const { data, status } = await requestFirecrawl<FirecrawlCrawlStartResponse>({
    apiKey,
    path: "/crawl",
    init: {
      method: "POST",
      body: JSON.stringify({
        url: payload.url,
        ...sanitizedPayload,
      }),
    },
  });

  if (!data) {
    return {
      result: {
        ok: false,
        error: "Empty Firecrawl response",
        status,
      },
      status,
    };
  }

  const id = data.id;
  if (!id) {
    const error = data.error ?? data.message ?? "Missing crawl job id";
    return {
      result: {
        ok: false,
        error,
        status,
        raw: data,
      },
      status,
    };
  }

  return {
    result: {
      ok: true,
      id,
    },
    status,
  };
};

export const performCrawlStatus = async (
  apiKey: string,
  id: string,
): Promise<{
  result: CrawlStatusResponseBody;
  status: number;
}> => {
  const { data, status } = await requestFirecrawl<FirecrawlCrawlStatus>({
    apiKey,
    path: `/crawl/${id}`,
    init: {
      method: "GET",
    },
  });

  if (!data) {
    return {
      result: {
        ok: false,
        error: "Empty Firecrawl response",
        status,
      },
      status,
    };
  }

  if (!data.success) {
    const error = data.error ?? data.message ?? "Crawl status failed";
    return {
      result: {
        ok: false,
        error,
        status,
        payload: data,
      },
      status,
    };
  }

  return {
    result: {
      ok: true,
      status: data.status,
      payload: data,
    },
    status,
  };
};

export const fetchCreditUsage = async (apiKey: string): Promise<CreditUsageResponse> => {
  const { data } = await requestFirecrawl<CreditUsageResponse>({
    apiKey,
    path: "/team/credit-usage",
    init: { method: "GET" },
  });

  if (!data || !data.success) {
    return {
      success: false,
      error: data?.error ?? "Failed to fetch credit usage",
    };
  }

  return data;
};
