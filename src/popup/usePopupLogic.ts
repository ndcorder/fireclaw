import { useCallback, useMemo, useRef, useState } from "react";

import type { CrawlStatusResponseBody } from "~lib/firecrawl";

import {
  createEmptyCrawlForm,
  type CrawlFormState,
  type CrawlStage,
  type CrawlStartFailure,
  type CrawlStartSuccess,
  type LastScrape,
  type ScrapeFailure,
  type ScrapeIntent,
  type ScrapeStage,
  type ScrapeSuccess,
  type ViewMode,
} from "./types";

export const usePopupLogic = () => {
  const [view, setViewState] = useState<ViewMode>("scrape");
  const [scrapeStage, setScrapeStage] = useState<ScrapeStage>({ tag: "idle" });
  const [crawlStage, setCrawlStage] = useState<CrawlStage>({ tag: "idle" });
  const [lastScrape, setLastScrape] = useState<LastScrape | undefined>(undefined);
  const [crawlStatus, setCrawlStatusState] = useState<CrawlStatusResponseBody | undefined>(
    undefined,
  );
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [optionsNotice, setOptionsNotice] = useState<string | undefined>(undefined);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const [crawlForm, setCrawlForm] = useState<CrawlFormState>(() => createEmptyCrawlForm());
  const [toastMessage, setToastMessage] = useState<string | undefined>(undefined);
  const [crawlData, setCrawlData] = useState<unknown[]>([]);
  const [hasDownloadedCrawl, setHasDownloadedCrawl] = useState(false);
  const [credits, setCredits] = useState<number | undefined>(undefined);

  const crawlJobId = useMemo(
    () => (crawlStage.tag === "success" ? crawlStage.payload.id : undefined),
    [crawlStage],
  );

  const isPolling = useMemo(() => {
    if (!crawlStatus || !crawlStatus.ok) {
      return false;
    }
    const status = crawlStatus.status;
    return status === "pending" || status === "processing";
  }, [crawlStatus]);

  const isCrawlComplete = useMemo(() => {
    if (!crawlStatus || !crawlStatus.ok) {
      return false;
    }
    return crawlStatus.status === "completed";
  }, [crawlStatus]);

  const setView = useCallback((next: ViewMode) => {
    setViewState(next);
    setOptionsOpen(false);
  }, []);

  const toggleOptions = useCallback(() => {
    setOptionsOpen((current) => !current);
  }, []);

  const togglePreview = useCallback(() => {
    setPreviewExpanded((current) => !current);
  }, []);

  const setNotice = useCallback((message: string) => {
    setOptionsNotice(message);
    if (noticeTimerRef.current !== undefined) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setOptionsNotice(undefined);
      noticeTimerRef.current = undefined;
    }, 3_000);
  }, []);

  const clearNotice = useCallback(() => {
    setOptionsNotice(undefined);
    if (noticeTimerRef.current !== undefined) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = undefined;
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage((current) => (current === message ? current : message));
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(undefined);
  }, []);

  const scrapeStarted = useCallback((intent: ScrapeIntent) => {
    setScrapeStage({ tag: "loading", intent });
    setPreviewExpanded(false);
  }, []);

  const scrapeFailed = useCallback(
    (intent: ScrapeIntent, message: string, detail?: ScrapeFailure) => {
      setScrapeStage({
        tag: "error",
        intent,
        message,
        detail,
      });
    },
    [],
  );

  const scrapeSucceeded = useCallback(
    (intent: ScrapeIntent, payload: ScrapeSuccess, note?: string) => {
      setScrapeStage({
        tag: "success",
        intent,
        payload,
        note,
      });
      setLastScrape({
        primary: payload.primary,
        format: payload.primaryFormat,
        mimeType: payload.mimeType,
        timestamp: new Date().toISOString(),
        raw: payload.raw,
        payload,
      });
      setPreviewExpanded(false);
    },
    [],
  );

  const scrapeNote = useCallback(
    (intent: ScrapeIntent, note: string) => {
      if (!lastScrape) {
        return;
      }
      setScrapeStage({
        tag: "success",
        intent,
        payload: lastScrape.payload,
        note,
      });
    },
    [lastScrape],
  );

  const crawlStarted = useCallback(() => {
    setCrawlStage({ tag: "loading" });
    setCrawlStatusState(undefined);
    setHasDownloadedCrawl(false);
  }, []);

  const crawlFailed = useCallback((message: string, detail?: CrawlStartFailure) => {
    setCrawlStage({
      tag: "error",
      message,
      detail,
    });
  }, []);

  const crawlSucceeded = useCallback((payload: CrawlStartSuccess) => {
    setCrawlStage({ tag: "success", payload });
  }, []);

  const setCrawlStatus = useCallback((payload: CrawlStatusResponseBody) => {
    setCrawlStatusState(payload);
    if (payload.ok && payload.payload?.data && Array.isArray(payload.payload.data)) {
      const data = payload.payload.data as unknown[];
      setCrawlData((current) => [...current, ...data]);
    }
  }, []);

  const updateCrawlForm: <Field extends keyof CrawlFormState>(
    field: Field,
    value: CrawlFormState[Field],
  ) => void = useCallback((field, value) => {
    setCrawlForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const resetCrawlForm = useCallback(() => {
    setCrawlForm(createEmptyCrawlForm());
  }, []);

  const resetCrawlData = useCallback(() => {
    setCrawlData([]);
  }, []);

  const markCrawlDownloaded = useCallback(() => {
    setHasDownloadedCrawl(true);
  }, []);

  const setCreditsAmount = useCallback((amount: number | undefined) => {
    setCredits(amount);
  }, []);

  const dispose = useCallback(() => {
    if (noticeTimerRef.current !== undefined) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = undefined;
    }
  }, []);

  return {
    view,
    setView,
    optionsOpen,
    toggleOptions,
    previewExpanded,
    togglePreview,
    optionsNotice,
    setNotice,
    clearNotice,
    scrapeStage,
    scrapeStarted,
    scrapeFailed,
    scrapeSucceeded,
    scrapeNote,
    lastScrape,
    crawlStage,
    crawlStarted,
    crawlFailed,
    crawlSucceeded,
    crawlStatus,
    setCrawlStatus,
    crawlJobId,
    isPolling,
    isCrawlComplete,
    crawlForm,
    updateCrawlForm,
    resetCrawlForm,
    crawlData,
    resetCrawlData,
    markCrawlDownloaded,
    hasDownloadedCrawl,
    showToast,
    clearToast,
    toastMessage,
    credits,
    setCredits: setCreditsAmount,
    dispose,
  } as const;
};
