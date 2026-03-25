import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorage } from "@plasmohq/storage/hook";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import * as R from "remeda";

import {
  formatKeysToSpecs,
  type FirecrawlFormatKey,
  type FirecrawlScrapeOptions,
} from "~lib/firecrawl";
import { API_KEY_STORAGE_KEY, PREFS_STORAGE_KEY, type StoredPreferences } from "~lib/storage";
import {
  requestCrawlStart,
  requestCrawlStatus,
  requestCreditUsage,
  requestScrape,
} from "~lib/messaging";
import { triggerDownload } from "~lib/download";

import { usePopupLogic } from "./usePopupLogic";
import { styles } from "./styles";
import {
  ensurePreferences,
  computeNextFormats,
  isScrapeFailure,
  isCrawlStartFailure,
  isCrawlStatusFailure,
  formatLabel,
  extractDomain,
  buildCrawlOptions,
} from "./utils";
import type { ScrapeIntent } from "./types";
import { ApiKeyEditor } from "./components/ApiKeyEditor";
import { ScrapeView } from "./components/ScrapeView";
import { CrawlView } from "./components/CrawlView";
import { Toast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const Popup = () => {
  const [tabUrl, setTabUrl] = useState("");
  const [apiKey, setApiKey, { isLoading: isApiLoading }] = useStorage<string>(
    API_KEY_STORAGE_KEY,
    (stored) => stored ?? "",
  );
  const [prefs, setPrefs] = useStorage<StoredPreferences>(PREFS_STORAGE_KEY, (initial) =>
    ensurePreferences(initial),
  );

  const lastCrawlStatusToastRef = useRef<string | undefined>(undefined);

  const {
    view: currentView,
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
    crawlData,
    resetCrawlData,
    markCrawlDownloaded,
    hasDownloadedCrawl,
    showToast,
    clearToast,
    toastMessage,
    credits,
    setCredits,
    dispose,
  } = usePopupLogic();

  const [apiKeyDraft, setApiKeyDraft] = useState("");

  useEffect(() => {
    if (!isApiLoading) {
      setApiKeyDraft(apiKey);
    }
  }, [isApiLoading, apiKey]);

  const trimmedStoredKey = apiKey.trim();
  const effectiveApiKey = trimmedStoredKey;
  const isApiConfigured = trimmedStoredKey.length > 0;
  const [apiEditorVisible, setApiEditorVisible] = useState(false);

  useEffect(() => {
    const fontLinkId = "firecrawl-ibm-plex-sans";
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement("link");
      link.id = fontLinkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
      document.head.append(link);
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        return;
      }
      setTabUrl(tab.url ?? "");
    });
  }, []);

  useEffect(() => {
    if (!isApiLoading) {
      setApiEditorVisible(!isApiConfigured);
    }
  }, [isApiLoading, isApiConfigured]);

  useEffect(() => () => dispose(), [dispose]);

  const normalizedPrefs = useMemo(
    () => ensurePreferences(prefs),
    [prefs?.formats, prefs?.onlyMainContent, prefs?.includeTags, prefs?.excludeTags],
  );

  const formatsSignature = useMemo(
    () => JSON.stringify(normalizedPrefs.formats),
    [normalizedPrefs.formats],
  );

  const activeFormats = useMemo<FirecrawlFormatKey[]>(
    () => [...normalizedPrefs.formats],
    [formatsSignature],
  );

  const useMainContent = normalizedPrefs.onlyMainContent ?? true;

  const requestOptions = useMemo<FirecrawlScrapeOptions>(
    () =>
      R.pipe(
        {
          formats: formatKeysToSpecs(activeFormats),
          onlyMainContent: useMainContent,
        },
        (value) => R.pickBy(value, (entry) => entry !== undefined),
      ) as FirecrawlScrapeOptions,
    [formatsSignature, useMainContent],
  );

  const creditsQuery = useQuery({
    queryKey: ["credits", effectiveApiKey],
    queryFn: async () => {
      const result = await requestCreditUsage({ apiKey: effectiveApiKey });
      if (result.success && result.data) {
        return result.data.remainingCredits;
      }
      throw new Error(result.error ?? "Failed to fetch credits");
    },
    enabled: Boolean(effectiveApiKey),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!creditsQuery.isSuccess) {
      if (creditsQuery.isError) {
        console.warn("Failed to fetch credits", creditsQuery.error);
      }
      return;
    }
    setCredits(creditsQuery.data);
  }, [
    creditsQuery.isSuccess,
    creditsQuery.isError,
    creditsQuery.error,
    creditsQuery.data,
    setCredits,
  ]);

  const refreshCrawlStatus = useCallback(
    async (id: string, key: string) => {
      try {
        const status = await requestCrawlStatus({ id, apiKey: key });
        setCrawlStatus(status);
        if (!isCrawlStatusFailure(status)) {
          const summary = `Crawl status: ${status.status ?? "unknown"}`;
          if (summary !== lastCrawlStatusToastRef.current) {
            showToast(summary);
            lastCrawlStatusToastRef.current = summary;
          }
        } else {
          const errorSummary = `Crawl status error: ${status.error}`;
          if (errorSummary !== lastCrawlStatusToastRef.current) {
            showToast(errorSummary);
            lastCrawlStatusToastRef.current = errorSummary;
          }
        }
      } catch (error) {
        setCrawlStatus({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to fetch crawl status",
        });
        const errorSummary =
          error instanceof Error ? error.message : "Unable to fetch crawl status";
        if (errorSummary !== lastCrawlStatusToastRef.current) {
          showToast(errorSummary);
          lastCrawlStatusToastRef.current = errorSummary;
        }
      }
    },
    [setCrawlStatus, showToast],
  );

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      clearToast();
    }, 3_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage, clearToast]);

  // Auto-polling effect for crawl status
  useEffect(() => {
    if (!crawlJobId || !effectiveApiKey) {
      return;
    }
    void refreshCrawlStatus(crawlJobId, effectiveApiKey);
    if (!isPolling) {
      return;
    }
    const interval = window.setInterval(() => {
      void refreshCrawlStatus(crawlJobId, effectiveApiKey);
    }, 3_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [crawlJobId, isPolling, effectiveApiKey, refreshCrawlStatus]);

  // Auto-download effect when crawl completes
  useEffect(() => {
    if (!isCrawlComplete || crawlData.length === 0 || hasDownloadedCrawl || !tabUrl) {
      return;
    }
    const downloadCrawlData = async () => {
      try {
        const content = JSON.stringify(crawlData, null, 2);
        const { filename } = await triggerDownload({
          sourceUrl: tabUrl,
          content,
          mimeType: "application/json",
          format: "json",
        });
        markCrawlDownloaded();
        showToast(`Crawl complete. Downloaded ${filename}`);
      } catch (error) {
        showToast(error instanceof Error ? `Download failed: ${error.message}` : "Download failed");
      }
    };
    void downloadCrawlData();
  }, [isCrawlComplete, crawlData, hasDownloadedCrawl, tabUrl, markCrawlDownloaded, showToast]);

  const toggleFormat = async (format: FirecrawlFormatKey) => {
    const removalAttemptsLast = activeFormats.length === 1 && activeFormats[0] === format;
    const nextFormats = computeNextFormats(activeFormats, format);

    if (removalAttemptsLast) {
      setNotice("At least one format must remain selected. Markdown restored.");
    } else {
      clearNotice();
    }

    await setPrefs((current) => {
      const base = ensurePreferences(current);
      return { ...base, formats: nextFormats };
    });
  };

  const toggleMainContent = async () => {
    await setPrefs((current) => {
      const base = ensurePreferences(current);
      return { ...base, onlyMainContent: !(base.onlyMainContent ?? true) };
    });
  };

  const withScrapePrechecks = async <T,>(
    intent: ScrapeIntent,
    action: () => Promise<T>,
  ): Promise<T | undefined> => {
    if (!tabUrl) {
      scrapeFailed(intent, "Unable to detect the active tab URL. Refresh and try again.");
      return undefined;
    }
    if (!effectiveApiKey) {
      scrapeFailed(intent, "Add your Firecrawl API key first.");
      return undefined;
    }
    scrapeStarted(intent);
    try {
      return await action();
    } catch (error) {
      scrapeFailed(intent, error instanceof Error ? error.message : "Unexpected error");
      return undefined;
    }
  };

  const handleScrape = async () => {
    const response = await withScrapePrechecks("preview", () =>
      requestScrape({ url: tabUrl, apiKey: effectiveApiKey, options: requestOptions }),
    );
    if (!response) return;

    if (isScrapeFailure(response)) {
      scrapeFailed("preview", response.error, response);
      return;
    }

    scrapeSucceeded("preview", response, "Scrape completed.");
    void creditsQuery.refetch();

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(response.primary);
        scrapeNote("preview", "Scrape copied to clipboard.");
        showToast("Scrape copied to clipboard.");
      } catch (error) {
        showToast(
          error instanceof Error
            ? `Scrape ready. Copy failed: ${error.message}`
            : "Scrape ready. Unable to auto-copy.",
        );
      }
    } else {
      showToast("Scrape ready. Copy from the preview.");
    }
  };

  const handleCopy = async () => {
    if (!lastScrape) {
      scrapeFailed("copy", "Scrape the page first to copy content.");
      return;
    }
    try {
      await navigator.clipboard.writeText(lastScrape.primary);
      scrapeNote("copy", "Copied to clipboard.");
      showToast("Copied to clipboard.");
    } catch (error) {
      scrapeFailed(
        "copy",
        error instanceof Error ? `Copy failed: ${error.message}` : "Copy failed",
      );
      showToast(error instanceof Error ? `Copy failed: ${error.message}` : "Copy failed");
    }
  };

  const handleDownload = async () => {
    if (!lastScrape) {
      scrapeFailed("download", "Scrape the page first to download content.");
      return;
    }
    if (!tabUrl) {
      scrapeFailed("download", "Unable to detect the active tab URL. Refresh and try again.");
      return;
    }
    try {
      const { filename } = await triggerDownload({
        sourceUrl: tabUrl,
        content: lastScrape.primary,
        mimeType: lastScrape.mimeType,
        format: lastScrape.format,
      });
      scrapeNote("download", `Download started (${filename}).`);
      showToast(`Download started (${filename})`);
    } catch (error) {
      scrapeFailed(
        "download",
        error instanceof Error ? `Download failed: ${error.message}` : "Download failed",
      );
      showToast(error instanceof Error ? `Download failed: ${error.message}` : "Download failed");
    }
  };

  const handleCrawlStart = async () => {
    if (!tabUrl) {
      crawlFailed("Unable to detect the active tab URL.");
      return;
    }
    if (!effectiveApiKey) {
      crawlFailed("Add your Firecrawl API key first.");
      return;
    }

    crawlStarted();
    lastCrawlStatusToastRef.current = undefined;
    resetCrawlData();

    const preparedOptions = buildCrawlOptions(crawlForm, requestOptions);

    try {
      const response = await requestCrawlStart({
        url: tabUrl,
        apiKey: effectiveApiKey,
        options: preparedOptions,
      });

      if (isCrawlStartFailure(response)) {
        crawlFailed(response.error, response);
        return;
      }

      crawlSucceeded(response);
      showToast("Crawl started.");
      void creditsQuery.refetch();
      await refreshCrawlStatus(response.id, effectiveApiKey);
    } catch (error) {
      const errorSummary = error instanceof Error ? error.message : "Unable to start crawl job";
      crawlFailed(errorSummary);
      showToast(errorSummary);
    }
  };

  const isScraping = scrapeStage.tag === "loading";
  const isCrawling = crawlStage.tag === "loading";

  const crawlStatusSummary = useMemo(() => {
    if (!crawlStatus) return undefined;
    if (isCrawlStatusFailure(crawlStatus)) return `Error: ${crawlStatus.error}`;
    return `Status: ${crawlStatus.status ?? "unknown"}`;
  }, [crawlStatus]);

  const formatSummary = useMemo(() => {
    if (activeFormats.length === 0) return "No formats selected";
    const primaryLabel = formatLabel(activeFormats[0]);
    const remaining = activeFormats.length - 1;
    return remaining > 0 ? `${primaryLabel} +${remaining} more` : primaryLabel;
  }, [activeFormats]);

  return (
    <main style={styles.container}>
      <header style={styles.compactHeader}>
        <div style={styles.apiDomainRow}>
          <span style={styles.domain}>{extractDomain(tabUrl) || "Detecting..."}</span>
          {credits !== undefined && (
            <span style={styles.credits}>{credits.toLocaleString()} credits</span>
          )}
          {!apiEditorVisible && isApiConfigured && (
            <button
              style={styles.editKeyButton}
              onClick={() => setApiEditorVisible(true)}
              type="button"
            >
              🔑 Edit key
            </button>
          )}
        </div>
      </header>

      <section style={styles.apiSection}>
        {apiEditorVisible ? (
          <ApiKeyEditor
            apiKeyDraft={apiKeyDraft}
            isApiConfigured={isApiConfigured}
            onDraftChange={setApiKeyDraft}
            onSave={() => {
              void (async () => {
                const trimmed = apiKeyDraft.trim();
                await setApiKey(trimmed);
                setApiKeyDraft(trimmed);
                clearNotice();
                setApiEditorVisible(false);
              })();
            }}
            onCancel={() => {
              setApiEditorVisible(false);
              setApiKeyDraft(apiKey);
              clearNotice();
            }}
          />
        ) : null}
      </section>

      <nav style={styles.viewToggle}>
        <button
          style={{
            ...styles.viewButton,
            ...(currentView === "scrape" ? styles.viewButtonActive : {}),
          }}
          onClick={() => setView("scrape")}
          type="button"
        >
          Scrape
        </button>
        <button
          style={{
            ...styles.viewButton,
            ...(currentView === "crawl" ? styles.viewButtonActive : {}),
          }}
          onClick={() => setView("crawl")}
          type="button"
        >
          Crawl
        </button>
      </nav>

      {currentView === "scrape" ? (
        <ScrapeView
          isScraping={isScraping}
          tabUrl={tabUrl}
          scrapeStage={scrapeStage}
          lastScrape={lastScrape}
          previewExpanded={previewExpanded}
          optionsOpen={optionsOpen}
          formatSummary={formatSummary}
          activeFormats={activeFormats}
          useMainContent={useMainContent}
          optionsNotice={optionsNotice}
          onScrape={() => void handleScrape()}
          onCopy={() => void handleCopy()}
          onDownload={() => void handleDownload()}
          onTogglePreview={togglePreview}
          onToggleOptions={toggleOptions}
          onToggleFormat={(key) => void toggleFormat(key)}
          onToggleMainContent={() => void toggleMainContent()}
        />
      ) : (
        <CrawlView
          isCrawling={isCrawling}
          tabUrl={tabUrl}
          crawlStage={crawlStage}
          crawlForm={crawlForm}
          crawlStatus={crawlStatus}
          crawlStatusSummary={crawlStatusSummary}
          crawlJobId={crawlJobId}
          isPolling={isPolling}
          onCrawlStart={() => void handleCrawlStart()}
          onUpdateForm={updateCrawlForm}
        />
      )}
      <Toast message={toastMessage} />
    </main>
  );
};

const PopupWithQueryClient = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Popup />
    </QueryClientProvider>
  </ErrorBoundary>
);

export default PopupWithQueryClient;
