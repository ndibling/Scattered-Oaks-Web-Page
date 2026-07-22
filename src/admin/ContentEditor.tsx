import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import type { SiteContent } from '../lib/types';
import { resizeImageFile } from '../lib/imageResize';
import FileDropZone from './FileDropZone';

// Keys backed by an uploaded file rather than free text — mirrors
// workers/routes/adminContent.ts's IMAGE_CONTENT_KEYS.
const IMAGE_CONTENT_KEYS = new Set(['site.logo_url', 'hero.photo_url', 'about.photo_url']);

export default function ContentEditor() {
  const [content, setContent] = useState<SiteContent>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<SiteContent>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .content()
      .then((c) => {
        setContent(c);
        setDrafts(c);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveText(key: string) {
    setError(null);
    setSavingKey(key);
    try {
      await api.updateContent(key, drafts[key] ?? '');
      setContent({ ...content, [key]: drafts[key] ?? '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not save ${key}.`);
    } finally {
      setSavingKey(null);
    }
  }

  async function saveImage(key: string, file: File) {
    setError(null);
    setSavingKey(key);
    try {
      const resized = await resizeImageFile(file);
      const form = new FormData();
      form.set('file', resized);
      const { value } = await api.updateContentImage(key, form);
      setContent({ ...content, [key]: value });
      setDrafts({ ...drafts, [key]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not upload ${key}.`);
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <p>Loading…</p>;

  const keys = Object.keys(content).sort();

  return (
    <div class="content-editor">
      <h1 class="content-editor-heading">Site Text &amp; Photos</h1>
      {error && <div class="content-editor-error">{error}</div>}
      <div class="content-editor-list">
        {keys.map((key) =>
          IMAGE_CONTENT_KEYS.has(key) ? (
            <div key={key} class="content-editor-row content-editor-row-image">
              <div class="content-editor-key">{key}</div>
              <img src={content[key]} alt="" class="content-editor-preview" />
              <FileDropZone
                accept="image/*"
                label={savingKey === key ? 'Uploading…' : 'Click or drag a replacement photo here'}
                onFileSelected={(file) => saveImage(key, file)}
              />
            </div>
          ) : (
            <div key={key} class="content-editor-row">
              <label class="content-editor-key" for={`content-${key}`}>
                {key}
              </label>
              {(drafts[key]?.length ?? 0) > 80 ? (
                <textarea
                  id={`content-${key}`}
                  rows={3}
                  value={drafts[key] ?? ''}
                  onInput={(e) =>
                    setDrafts({ ...drafts, [key]: (e.target as HTMLTextAreaElement).value })
                  }
                />
              ) : (
                <input
                  id={`content-${key}`}
                  type="text"
                  value={drafts[key] ?? ''}
                  onInput={(e) =>
                    setDrafts({ ...drafts, [key]: (e.target as HTMLInputElement).value })
                  }
                />
              )}
              <button
                type="button"
                disabled={drafts[key] === content[key] || savingKey === key}
                onClick={() => saveText(key)}
              >
                {savingKey === key ? 'Saving…' : 'Save'}
              </button>
            </div>
          ),
        )}
      </div>

      <style>{`
        .content-editor-heading {
          font-family: var(--font-heading);
          color: var(--color-heading);
        }
        .content-editor-error {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-radius: var(--radius-input);
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .content-editor-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .content-editor-row {
          background: var(--color-surface);
          border-radius: var(--radius-input);
          padding: 12px 14px;
          display: grid;
          grid-template-columns: 200px 1fr auto;
          gap: 12px;
          align-items: start;
        }
        .content-editor-row-image {
          grid-template-columns: 200px 120px 1fr;
        }
        .content-editor-key {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--color-text-muted);
          word-break: break-all;
        }
        .content-editor-row input,
        .content-editor-row textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 14px;
          font-family: var(--font-body);
        }
        .content-editor-row button {
          background: var(--color-accent);
          color: var(--color-surface);
          border: none;
          border-radius: var(--radius-input);
          padding: 8px 14px;
          cursor: pointer;
          font-size: 13px;
          height: fit-content;
        }
        .content-editor-row button:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .content-editor-preview {
          width: 100%;
          height: 70px;
          object-fit: cover;
          border-radius: var(--radius-input);
        }
      `}</style>
    </div>
  );
}
