import type { PlasmoMessaging } from "@plasmohq/messaging";

import {
  performCrawlStatus,
  type CrawlStatusRequestBody,
  type CrawlStatusResponseBody,
} from "~lib/firecrawl";
import { getStoredApiKey } from "~lib/storage";

const resolveApiKey = async (provided?: string) => {
  if (provided?.trim()) {
    return provided.trim();
  }

  return getStoredApiKey();
};

const handler: PlasmoMessaging.MessageHandler<
  CrawlStatusRequestBody,
  CrawlStatusResponseBody
> = async (req, res) => {
  try {
    const { id, apiKey: providedKey } = req.body ?? {};

    if (!id) {
      res.send({
        ok: false,
        error: "Missing crawl job id",
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

    const { result } = await performCrawlStatus(apiKey, id);
    res.send(result);
  } catch (error) {
    console.error("Crawl status handler crashed", error);
    res.send({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected crawl status error",
    });
  }
};

export default handler;
