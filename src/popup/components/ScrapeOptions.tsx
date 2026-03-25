import type { FirecrawlFormatKey } from "~lib/firecrawl";

import { styles } from "../styles";
import { AVAILABLE_FORMAT_OPTIONS } from "../utils";

type Props = {
  optionsOpen: boolean;
  formatSummary: string;
  activeFormats: FirecrawlFormatKey[];
  useMainContent: boolean;
  optionsNotice: string | undefined;
  onToggleOptions: () => void;
  onToggleFormat: (key: FirecrawlFormatKey) => void;
  onToggleMainContent: () => void;
};

export const ScrapeOptions = ({
  optionsOpen,
  formatSummary,
  activeFormats,
  useMainContent,
  optionsNotice,
  onToggleOptions,
  onToggleFormat,
  onToggleMainContent,
}: Props) => (
  <div>
    <button
      style={{
        ...styles.disclosure,
        ...(optionsOpen ? styles.disclosureActive : {}),
      }}
      onClick={onToggleOptions}
      type="button"
    >
      <span>Options</span>
      <span style={styles.disclosureSummary}>{formatSummary}</span>
    </button>
    {optionsOpen ? (
      <div style={styles.optionsBody}>
        <ul style={styles.formatList}>
          {AVAILABLE_FORMAT_OPTIONS.map((format) => {
            const checked = activeFormats.includes(format.key);
            return (
              <li key={format.key} style={styles.formatItem}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleFormat(format.key)}
                  />
                  <div style={styles.formatLabelGroup}>
                    <span style={styles.formatLabelText}>{format.label}</span>
                    {format.recommended ? (
                      <span style={styles.recommendedBadge}>Recommended</span>
                    ) : null}
                  </div>
                </label>
                <p style={styles.formatHelper}>{format.helper}</p>
              </li>
            );
          })}
        </ul>
        <label style={styles.checkboxLabel}>
          <input type="checkbox" checked={useMainContent} onChange={onToggleMainContent} />
          <span style={styles.formatLabelText}>Only main content</span>
        </label>
        {optionsNotice ? <p style={styles.notice}>{optionsNotice}</p> : null}
      </div>
    ) : null}
    <div style={styles.sectionDivider} />
  </div>
);
