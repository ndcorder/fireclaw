import { useState } from "react";
import { requestCreditUsage } from "~lib/messaging";
import { styles } from "../styles";
import { colors, font, radii, space } from "../design";

type ValidationState = "idle" | "validating" | "valid" | "invalid";

type Props = {
  apiKeyDraft: string;
  isApiConfigured: boolean;
  onDraftChange: (value: string) => void;
  onSave: (validatedKey: string) => void;
  onCancel: () => void;
};

export const ApiKeyEditor = ({
  apiKeyDraft,
  isApiConfigured,
  onDraftChange,
  onSave,
  onCancel,
}: Props) => {
  const [validation, setValidation] = useState<ValidationState>("idle");
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  const handleSave = async () => {
    const trimmed = apiKeyDraft.trim();
    if (!trimmed) {
      setValidation("invalid");
      setValidationError("API key cannot be empty.");
      return;
    }

    setValidation("validating");
    setValidationError(undefined);

    try {
      const result = await requestCreditUsage({ apiKey: trimmed });
      if (result.success) {
        setValidation("valid");
        onSave(trimmed);
      } else {
        setValidation("invalid");
        setValidationError(result.error ?? "Invalid API key. Check and try again.");
      }
    } catch {
      setValidation("invalid");
      setValidationError("Could not reach Firecrawl. Check your connection.");
    }
  };

  const handleDraftChange = (value: string) => {
    onDraftChange(value);
    if (validation !== "idle") {
      setValidation("idle");
      setValidationError(undefined);
    }
  };

  const isValidating = validation === "validating";

  return (
    <div style={styles.apiEditor}>
      <label style={styles.apiLabel} htmlFor="firecrawl-api-key">
        Firecrawl API key
      </label>
      <input
        id="firecrawl-api-key"
        style={{
          ...styles.input,
          ...(validation === "invalid"
            ? { borderColor: colors.danger }
            : validation === "valid"
              ? { borderColor: colors.success }
              : {}),
        }}
        placeholder="fc-..."
        value={apiKeyDraft}
        onChange={(event) => handleDraftChange(event.target.value)}
        disabled={isValidating}
      />
      <p style={styles.helper}>Stored locally in your browser.</p>
      {validationError && (
        <p
          style={{
            margin: `${space.xs}px 0 0`,
            fontSize: font.size.xs,
            color: colors.danger,
            backgroundColor: colors.dangerTint,
            padding: `${space.xs}px ${space.sm}px`,
            borderRadius: radii.sm,
          }}
        >
          {validationError}
        </p>
      )}
      <div style={styles.apiActions}>
        <button
          style={{
            ...styles.primaryButtonSmall,
            ...(isValidating ? { opacity: 0.7, cursor: "default" } : {}),
          }}
          onClick={() => void handleSave()}
          disabled={isValidating}
          type="button"
        >
          {isValidating ? "Validating\u2026" : "Save"}
        </button>
        {isApiConfigured ? (
          <button
            style={styles.linkButton}
            onClick={onCancel}
            disabled={isValidating}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
};
