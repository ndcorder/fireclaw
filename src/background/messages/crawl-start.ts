import type { PlasmoMessaging } from "@plasmohq/messaging";
import * as R from "remeda";

import {
  performCrawlStart,
  type CrawlStartRequestBody,
  type CrawlStartResponseBody,
} from "~lib/firecrawl";
import { getStoredApiKey } from "~lib/storage";

const sanitizeOptions = (options?: Record<string, unknown>) =>
  R.pickBy(options ?? {}, (value) => value !== undefined);

const resolveApiKey = async (provided?: string) => {
  if (provided?.trim()) {
    return provided.trim();
  }

  return getStoredApiKey();
};

const handler: PlasmoMessaging.MessageHandler<
  CrawlStartRequestBody,
  CrawlStartResponseBody
> = async (req, res) => {
  try {
    const { url, options, apiKey: providedKey } = req.body ?? {};

    if (!url) {
      res.send({
        ok: false,
        error: "Missing URL to crawl",
      });
      return;
    }

    const apiKey = await resolveApiKey(providedKey);

    if (!apiKey) {
      res.send({
        ok: false,
        error: "Missing Firecrawl API key",
      });
      return;
    }

    const effectiveOptions = sanitizeOptions(options);

    const { result } = await performCrawlStart(apiKey, {
      url,
      options: effectiveOptions,
      apiKey,
    });

    res.send(result);
  } catch (error) {
    console.error("Crawl start handler crashed", error);
    res.send({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected crawl start error",
    });
  }
};

export default handler;
