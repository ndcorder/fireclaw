import type { CrawlStatusResponseBody } from "~lib/firecrawl";

import {
  DEFAULT_CRAWL_FORM,
  type CrawlFormState,
  type CrawlStage,
  type SitemapMode,
} from "../types";
import { styles } from "../styles";
import { getStatusDotStyle } from "../utils";

type Props = {
  isCrawling: boolean;
  tabUrl: string;
  crawlStage: CrawlStage;
  crawlForm: CrawlFormState;
  crawlStatus: CrawlStatusResponseBody | undefined;
  crawlStatusSummary: string | undefined;
  crawlJobId: string | undefined;
  isPolling: boolean;
  onCrawlStart: () => void;
  onUpdateForm: <F extends keyof CrawlFormState>(field: F, value: CrawlFormState[F]) => void;
};

export const CrawlView = ({
  isCrawling,
  tabUrl,
  crawlStage,
  crawlForm,
  crawlStatus,
  crawlStatusSummary,
  crawlJobId,
  isPolling,
  onCrawlStart,
  onUpdateForm,
}: Props) => (
  <div>
    <button
      style={{
        ...styles.primaryButton,
        ...(isCrawling ? styles.primaryButtonBusy : {}),
      }}
      disabled={isCrawling || !tabUrl}
      onClick={onCrawlStart}
      type="button"
    >
      {isCrawling ? "Starting crawl\u2026" : "Start crawl"}
    </button>
    <div style={styles.formStack}>
      <label style={styles.fieldLabel}>
        <span>Prompt</span>
        <textarea
          rows={2}
          style={styles.textarea}
          placeholder={DEFAULT_CRAWL_FORM.prompt}
          value={crawlForm.prompt}
          onChange={(event) => onUpdateForm("prompt", event.target.value)}
        />
      </label>
      <div style={styles.fieldRow}>
        <label style={styles.fieldLabel}>
          <span>Max pages</span>
          <input
            style={styles.input}
            type="number"
            min={1}
            placeholder={DEFAULT_CRAWL_FORM.limit}
            value={crawlForm.limit}
            onChange={(event) => onUpdateForm("limit", event.target.value)}
          />
        </label>
        <label style={styles.fieldLabel}>
          <span>Max depth</span>
          <input
            style={styles.input}
            type="number"
            min={0}
            placeholder={DEFAULT_CRAWL_FORM.maxDiscoveryDepth}
            value={crawlForm.maxDiscoveryDepth}
            onChange={(event) => onUpdateForm("maxDiscoveryDepth", event.target.value)}
          />
        </label>
      </div>
      <div style={styles.fieldRow}>
        <label style={styles.fieldLabel}>
          <span>Sitemap mode</span>
          <select
            style={styles.select}
            value={crawlForm.sitemap}
            onChange={(event) => onUpdateForm("sitemap", event.target.value as SitemapMode)}
          >
            <option value="include">Include sitemap</option>
            <option value="skip">Skip sitemap</option>
          </select>
        </label>
        <label style={styles.fieldLabel}>
          <span>Delay (seconds)</span>
          <input
            style={styles.input}
            type="number"
            min={0}
            step={0.1}
            placeholder={DEFAULT_CRAWL_FORM.delay}
            value={crawlForm.delay}
            onChange={(event) => onUpdateForm("delay", event.target.value)}
          />
        </label>
      </div>
      <div style={styles.fieldRow}>
        <label style={styles.fieldLabel}>
          <span>Max concurrency</span>
          <input
            style={styles.input}
            type="number"
            min={1}
            placeholder={DEFAULT_CRAWL_FORM.maxConcurrency}
            value={crawlForm.maxConcurrency}
            onChange={(event) => onUpdateForm("maxConcurrency", event.target.value)}
          />
        </label>
      </div>
      <div style={styles.checkGrid}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={crawlForm.ignoreQueryParameters}
            onChange={(event) => onUpdateForm("ignoreQueryParameters", event.target.checked)}
          />
          <span>Ignore query parameters</span>
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={crawlForm.crawlEntireDomain}
            onChange={(event) => onUpdateForm("crawlEntireDomain", event.target.checked)}
          />
          <span>Crawl entire domain</span>
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={crawlForm.allowSubdomains}
            onChange={(event) => onUpdateForm("allowSubdomains", event.target.checked)}
          />
          <span>Allow subdomains</span>
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={crawlForm.allowExternalLinks}
            onChange={(event) => onUpdateForm("allowExternalLinks", event.target.checked)}
          />
          <span>Allow external links</span>
        </label>
      </div>
      <div style={styles.fieldRow}>
        <label style={styles.fieldLabel}>
          <span>Include paths (one per line)</span>
          <textarea
            rows={2}
            style={styles.textarea}
            placeholder={DEFAULT_CRAWL_FORM.includePaths}
            value={crawlForm.includePaths}
            onChange={(event) => onUpdateForm("includePaths", event.target.value)}
          />
        </label>
        <label style={styles.fieldLabel}>
          <span>Exclude paths (one per line)</span>
          <textarea
            rows={2}
            style={styles.textarea}
            placeholder={DEFAULT_CRAWL_FORM.excludePaths}
            value={crawlForm.excludePaths}
            onChange={(event) => onUpdateForm("excludePaths", event.target.value)}
          />
        </label>
      </div>
    </div>
    {crawlStage.tag === "error" ? <p style={styles.error}>{crawlStage.message}</p> : null}
    {crawlStatusSummary && crawlJobId ? (
      <div style={styles.crawlStatusRow}>
        <span style={getStatusDotStyle(crawlStatus?.ok ? crawlStatus.status : undefined)} />
        <p style={styles.crawlText}>{crawlStatusSummary}</p>
        {isPolling && <span style={styles.pollingIndicator}>(auto-refresh)</span>}
      </div>
    ) : null}
  </div>
);
