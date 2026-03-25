import { sendToBackground } from "@plasmohq/messaging";
import * as R from "remeda";

import type {
  CrawlStartRequestBody,
  CrawlStartResponseBody,
  CrawlStatusRequestBody,
  CrawlStatusResponseBody,
  CreditUsageResponse,
  ScrapeRequestBody,
  ScrapeResponseBody,
} from "./firecrawl";

type MessageName = "scrape" | "crawl-start" | "crawl-status" | "credit-usage";

type SendFx = <Req, Res>(input: { name: MessageName; body: Req }) => Promise<Res>;

const sendMessage = sendToBackground as unknown as SendFx;

export const requestScrape = (body: ScrapeRequestBody) =>
  sendMessage<ScrapeRequestBody, ScrapeResponseBody>({
    name: "scrape",
    body: R.clone(body),
  });

export const requestCrawlStart = (body: CrawlStartRequestBody) =>
  sendMessage<CrawlStartRequestBody, CrawlStartResponseBody>({
    name: "crawl-start",
    body: R.clone(body),
  });

export const requestCrawlStatus = (body: CrawlStatusRequestBody) =>
  sendMessage<CrawlStatusRequestBody, CrawlStatusResponseBody>({
    name: "crawl-status",
    body: R.clone(body),
  });

export const requestCreditUsage = (body: { apiKey?: string }) =>
  sendMessage<{ apiKey?: string }, CreditUsageResponse>({
    name: "credit-usage",
    body: R.clone(body),
  });
