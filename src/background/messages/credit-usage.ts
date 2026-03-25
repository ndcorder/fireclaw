import type { PlasmoMessaging } from "@plasmohq/messaging";

import { fetchCreditUsage, type CreditUsageResponse } from "~lib/firecrawl";
import { getStoredApiKey } from "~lib/storage";

type RequestBody = { apiKey?: string };

const resolveApiKey = async (provided?: string) => {
  if (provided?.trim()) {
    return provided.trim();
  }

  return getStoredApiKey();
};

const handler: PlasmoMessaging.MessageHandler<RequestBody, CreditUsageResponse> = async (
  req,
  res,
) => {
  try {
    const apiKey = await resolveApiKey(req.body?.apiKey);

    if (!apiKey) {
      res.send({
        success: false,
        error: "Missing Firecrawl API key",
      });
      return;
    }

    const result = await fetchCreditUsage(apiKey);
    res.send(result);
  } catch (error) {
    console.error("Credit usage handler crashed", error);
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credit usage",
    });
  }
};

export default handler;
