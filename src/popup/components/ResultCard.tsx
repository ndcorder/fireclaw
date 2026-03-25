import type { LastScrape } from "../types";
import { styles } from "../styles";
import { previewSnippet } from "../utils";

type Props = {
  lastScrape: LastScrape;
  previewExpanded: boolean;
  onTogglePreview: () => void;
  onCopy: () => void;
  onDownload: () => void;
};

export const ResultCard = ({
  lastScrape,
  previewExpanded,
  onTogglePreview,
  onCopy,
  onDownload,
}: Props) => {
  const totalLength = lastScrape.primary.length;
  const hasOverflow = totalLength > 400;
  const preview = previewSnippet(lastScrape.primary, previewExpanded);

  return (
    <div>
      <div style={styles.previewContainer}>
        <pre style={styles.preview}>{preview}</pre>
        {hasOverflow ? (
          <button style={styles.linkButton} onClick={onTogglePreview} type="button">
            {previewExpanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>
      <div style={styles.resultActions}>
        <button style={styles.tertiaryButton} onClick={onCopy} type="button">
          Copy
        </button>
        <button style={styles.tertiaryButton} onClick={onDownload} type="button">
          Download
        </button>
      </div>
    </div>
  );
};
