import type { FirecrawlFormatKey } from "~lib/firecrawl";

import type { LastScrape, ScrapeStage } from "../types";
import { styles } from "../styles";
import { ScrapeOptions } from "./ScrapeOptions";
import { ResultCard } from "./ResultCard";

type Props = {
  isScraping: boolean;
  tabUrl: string;
  scrapeStage: ScrapeStage;
  lastScrape: LastScrape | undefined;
  previewExpanded: boolean;
  optionsOpen: boolean;
  formatSummary: string;
  activeFormats: FirecrawlFormatKey[];
  useMainContent: boolean;
  optionsNotice: string | undefined;
  onScrape: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onTogglePreview: () => void;
  onToggleOptions: () => void;
  onToggleFormat: (key: FirecrawlFormatKey) => void;
  onToggleMainContent: () => void;
};

export const ScrapeView = ({
  isScraping,
  tabUrl,
  scrapeStage,
  lastScrape,
  previewExpanded,
  optionsOpen,
  formatSummary,
  activeFormats,
  useMainContent,
  optionsNotice,
  onScrape,
  onCopy,
  onDownload,
  onTogglePreview,
  onToggleOptions,
  onToggleFormat,
  onToggleMainContent,
}: Props) => (
  <>
    <div>
      <button
        style={{
          ...styles.primaryButton,
          ...(isScraping ? styles.primaryButtonBusy : {}),
        }}
        disabled={isScraping || !tabUrl}
        onClick={onScrape}
        type="button"
      >
        {isScraping ? "Scraping\u2026" : "Scrape page"}
      </button>
      <p style={styles.microcopy}>1 credit</p>
      {scrapeStage.tag === "error" ? <p style={styles.error}>{scrapeStage.message}</p> : null}
    </div>
    <div style={styles.sectionDivider} />
    <ScrapeOptions
      optionsOpen={optionsOpen}
      formatSummary={formatSummary}
      activeFormats={activeFormats}
      useMainContent={useMainContent}
      optionsNotice={optionsNotice}
      onToggleOptions={onToggleOptions}
      onToggleFormat={onToggleFormat}
      onToggleMainContent={onToggleMainContent}
    />
    {lastScrape ? (
      <ResultCard
        lastScrape={lastScrape}
        previewExpanded={previewExpanded}
        onTogglePreview={onTogglePreview}
        onCopy={onCopy}
        onDownload={onDownload}
      />
    ) : null}
  </>
);
