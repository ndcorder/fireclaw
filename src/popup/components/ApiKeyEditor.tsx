import { styles } from "../styles";

type Props = {
  apiKeyDraft: string;
  isApiConfigured: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export const ApiKeyEditor = ({
  apiKeyDraft,
  isApiConfigured,
  onDraftChange,
  onSave,
  onCancel,
}: Props) => (
  <div style={styles.apiEditor}>
    <label style={styles.apiLabel} htmlFor="firecrawl-api-key">
      Firecrawl API key
    </label>
    <input
      id="firecrawl-api-key"
      style={styles.input}
      placeholder="fc-..."
      value={apiKeyDraft}
      onChange={(event) => onDraftChange(event.target.value)}
    />
    <p style={styles.helper}>Stored locally in your browser.</p>
    <div style={styles.apiActions}>
      <button style={styles.primaryButtonSmall} onClick={onSave} type="button">
        Save
      </button>
      {isApiConfigured ? (
        <button style={styles.linkButton} onClick={onCancel} type="button">
          Cancel
        </button>
      ) : null}
    </div>
  </div>
);
