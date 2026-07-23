import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import type { GalleryPhoto } from '../lib/types';
import { resizeImageFile } from '../lib/imageResize';
import FileDropZone from './FileDropZone';

export default function GalleryEditor() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .gallery()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleUpload(file: File) {
    if (!newLabel.trim()) {
      setError('Give the photo a label before uploading.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const resized = await resizeImageFile(file);
      const form = new FormData();
      form.set('file', resized);
      form.set('label', newLabel.trim());
      await api.createGalleryPhoto(form);
      setNewLabel('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  function startEdit(photo: GalleryPhoto) {
    setEditingId(photo.id);
    setEditLabel(photo.label);
    setEditDescription(photo.description ?? '');
  }

  async function saveEdit(photo: GalleryPhoto) {
    await api.updateGalleryPhoto(photo.id, {
      label: editLabel,
      description: editDescription,
      display_order: photo.display_order,
    });
    setEditingId(null);
    refresh();
  }

  async function handleDelete(photo: GalleryPhoto) {
    if (!confirm(`Delete the photo "${photo.label}"?`)) return;
    await api.deleteGalleryPhoto(photo.id);
    refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setPhotos(reordered);
    await api.reorderGalleryPhotos(reordered.map((p) => p.id));
  }

  return (
    <div class="gallery-editor">
      <h1 class="gallery-editor-heading">Gallery</h1>
      {error && <div class="gallery-editor-error">{error}</div>}

      <div class="gallery-editor-upload">
        <input
          type="text"
          placeholder="Photo label"
          value={newLabel}
          onInput={(e) => setNewLabel((e.target as HTMLInputElement).value)}
        />
        <FileDropZone
          accept="image/*"
          label={uploading ? 'Uploading…' : 'Click or drag a photo here to add it'}
          onFileSelected={handleUpload}
        />
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div class="gallery-editor-grid">
          {photos.map((photo, i) => (
            <div key={photo.id} class="gallery-editor-item">
              <img src={photo.url} alt={photo.label} loading="lazy" />
              {editingId === photo.id ? (
                <div class="gallery-editor-edit-form">
                  <input
                    value={editLabel}
                    onInput={(e) => setEditLabel((e.target as HTMLInputElement).value)}
                  />
                  <textarea
                    rows={2}
                    value={editDescription}
                    onInput={(e) => setEditDescription((e.target as HTMLTextAreaElement).value)}
                  />
                  <div class="gallery-editor-item-actions">
                    <button type="button" onClick={() => saveEdit(photo)}>
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div class="gallery-editor-item-label">{photo.label}</div>
                  <div class="gallery-editor-item-actions">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`Move ${photo.label} up`}
                    >
                      &uarr;
                    </button>
                    <button
                      type="button"
                      disabled={i === photos.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`Move ${photo.label} down`}
                    >
                      &darr;
                    </button>
                    <button type="button" onClick={() => startEdit(photo)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      class="gallery-editor-delete-btn"
                      onClick={() => handleDelete(photo)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .gallery-editor-heading {
          font-family: var(--font-heading);
          color: var(--color-heading);
        }
        .gallery-editor-error {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-radius: var(--radius-input);
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .gallery-editor-upload {
          background: var(--color-surface);
          border-radius: var(--radius-card);
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 360px;
        }
        .gallery-editor-upload input {
          padding: 10px 12px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 14px;
        }
        .gallery-editor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .gallery-editor-item {
          background: var(--color-surface);
          border-radius: var(--radius-card);
          overflow: hidden;
          padding-bottom: 10px;
        }
        .gallery-editor-item img {
          width: 100%;
          height: 130px;
          object-fit: cover;
        }
        .gallery-editor-item-label {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          padding: 8px 10px 4px;
          color: var(--color-heading);
        }
        .gallery-editor-item-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          padding: 0 10px;
        }
        .gallery-editor-item-actions button {
          background: var(--color-surface-alt);
          border: none;
          border-radius: var(--radius-input);
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .gallery-editor-delete-btn {
          color: var(--color-danger);
        }
        .gallery-editor-edit-form {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0 10px;
        }
        .gallery-editor-edit-form input,
        .gallery-editor-edit-form textarea {
          padding: 6px 8px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
