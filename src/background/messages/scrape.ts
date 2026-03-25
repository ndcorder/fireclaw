import type { PlasmoMessaging } from "@plasmohq/messaging";
import * as R from "remeda";

import {
  performScrape,
  type FirecrawlScrapeOptions,
  type ScrapeRequestBody,
  type ScrapeResponseBody,
} from "~lib/firecrawl";
import { getStoredApiKey, getStoredPreferences, preferencesToScrapeOptions } from "~lib/storage";

const assembleOptions = async (
  options: FirecrawlScrapeOptions | undefined,
): Promise<FirecrawlScrapeOptions> => {
  const stored = preferencesToScrapeOptions(await getStoredPreferences());
  const merged = {
    ...stored,
    ...(options ?? {}),
  };

  const formats = options?.formats ?? stored.formats;

  return R.pipe(
    {
      ...merged,
      ...(formats ? { formats } : {}),
    },
    (value) => R.pickBy(value, (entry) => entry !== undefined),
  ) as FirecrawlScrapeOptions;
};

const resolveApiKey = async (provided?: string) => {
  if (provided?.trim()) {
    return provided.trim();
  }

  return getStoredApiKey();
};

const handler: PlasmoMessaging.MessageHandler<ScrapeRequestBody, ScrapeResponseBody> = async (
  req,
  res,
) => {
  try {
    const { url, options, apiKey: providedKey } = req.body ?? {};

    if (!url) {
      res.send({
        ok: false,
        error: "Missing URL to scrape",
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

    const preparedOptions = await assembleOptions(options);

    const { result } = await performScrape(apiKey, {
      url,
      ...preparedOptions,
    });

    res.send(result);
  } catch (error) {
    console.error("Scrape handler crashed", error);
    res.send({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected scrape error",
    });
  }
};

export default handler;
