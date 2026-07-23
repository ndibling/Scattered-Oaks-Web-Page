import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import type { Animal, AnimalDetail, AnimalInput, AnimalStatus } from '../lib/types';
import { resizeImageFile } from '../lib/imageResize';
import FileDropZone from './FileDropZone';

const STATUS_OPTIONS: AnimalStatus[] = ['for-sale', 'pending', 'coming-soon', 'not-for-sale'];

const BLANK_FORM: AnimalInput = {
  name: '',
  registered_name: '',
  type: '',
  sex: '',
  age_text: '',
  status: 'for-sale',
  price_cents: null,
  description: '',
  imza_number: '',
  expected_height: '',
  sire_registered_name: '',
  dam_registered_name: '',
};

function centsToDollarsString(cents: number | null | undefined): string {
  return cents == null ? '' : (cents / 100).toString();
}

function dollarsStringToCents(value: string): number | null {
  if (!value.trim()) return null;
  const dollars = Number(value);
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : null;
}

export default function AnimalEditor() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [detail, setDetail] = useState<AnimalDetail | null>(null);
  const [form, setForm] = useState<AnimalInput>(BLANK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .animals()
      .then(setAnimals)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  // Only fetches an existing animal's detail — entering "new" mode resets
  // form/detail synchronously in the "+ Add Animal" click handler instead of
  // here, so there's no async gap between the reset and the form appearing
  // for a real edit->add transition (without a remount, form still holds the
  // previous animal's data until something clears it). Doing that reset in
  // an effect instead left a real race: a fast automated fill (or a fast
  // typist) could land between "new" mode's first render and this effect
  // committing, and the effect's setForm(BLANK_FORM) would then silently
  // wipe out whatever had just been typed.
  useEffect(() => {
    if (editingId && editingId !== 'new') {
      api.animal(editingId).then((full) => {
        setDetail(full);
        setForm({ ...full, price_cents: full.price_cents });
      });
    }
  }, [editingId]);

  async function handleSave(e: Event) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingId === 'new') {
        await api.createAnimal(form);
      } else if (editingId) {
        await api.updateAnimal(editingId, form);
      }
      setEditingId(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save animal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(animal: Animal) {
    if (!confirm(`Delete ${animal.name}? This can be undone by contacting the developer.`)) return;
    await api.deleteAnimal(animal.id);
    refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= animals.length) return;
    const reordered = [...animals];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setAnimals(reordered);
    await api.reorderAnimals(reordered.map((a) => a.id));
  }

  async function handleUpload(file: File, mediaType: 'image' | 'video') {
    if (!detail) return;
    setUploading(true);
    try {
      const resized = await resizeImageFile(file);
      const form2 = new FormData();
      form2.set('file', resized);
      form2.set('media_type', mediaType);
      const media = await api.uploadAnimalMedia(detail.id, form2);
      setDetail({ ...detail, media: [...detail.media, media] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload media.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!detail) return;
    await api.deleteAnimalMedia(detail.id, mediaId);
    setDetail({ ...detail, media: detail.media.filter((m) => m.id !== mediaId) });
  }

  if (editingId) {
    return (
      <div class="animal-editor-form-wrap">
        <button type="button" class="animal-editor-back-btn" onClick={() => setEditingId(null)}>
          &larr; Back to list
        </button>
        <h1 class="animal-editor-heading">
          {editingId === 'new' ? 'Add Animal' : `Edit ${form.name}`}
        </h1>
        {error && <div class="animal-editor-error">{error}</div>}
        <form class="animal-editor-form" onSubmit={handleSave}>
          <div class="animal-editor-grid">
            <label>
              Name
              <input
                required
                value={form.name}
                onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })}
              />
            </label>
            <label>
              Registered Name
              <input
                value={form.registered_name ?? ''}
                onInput={(e) =>
                  setForm({ ...form, registered_name: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <label>
              Type
              <input
                required
                value={form.type}
                onInput={(e) => setForm({ ...form, type: (e.target as HTMLInputElement).value })}
              />
            </label>
            <label>
              Sex
              <input
                required
                value={form.sex}
                onInput={(e) => setForm({ ...form, sex: (e.target as HTMLInputElement).value })}
              />
            </label>
            <label>
              Age
              <input
                value={form.age_text ?? ''}
                onInput={(e) =>
                  setForm({ ...form, age_text: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: (e.target as HTMLSelectElement).value as AnimalStatus,
                  })
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price (USD, blank = not for sale)
              <input
                type="number"
                step="0.01"
                value={centsToDollarsString(form.price_cents)}
                onInput={(e) =>
                  setForm({
                    ...form,
                    price_cents: dollarsStringToCents((e.target as HTMLInputElement).value),
                  })
                }
              />
            </label>
            <label>
              IMZA #
              <input
                value={form.imza_number ?? ''}
                onInput={(e) =>
                  setForm({ ...form, imza_number: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <label>
              Expected Height
              <input
                value={form.expected_height ?? ''}
                onInput={(e) =>
                  setForm({ ...form, expected_height: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <label>
              Sire (Registered Name)
              <input
                value={form.sire_registered_name ?? ''}
                onInput={(e) =>
                  setForm({ ...form, sire_registered_name: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <label>
              Dam (Registered Name)
              <input
                value={form.dam_registered_name ?? ''}
                onInput={(e) =>
                  setForm({ ...form, dam_registered_name: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <label class="animal-editor-span">
              Description
              <textarea
                rows={4}
                value={form.description ?? ''}
                onInput={(e) =>
                  setForm({ ...form, description: (e.target as HTMLTextAreaElement).value })
                }
              />
            </label>
          </div>
          <button type="submit" class="animal-editor-save-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save Animal'}
          </button>
        </form>

        {detail && (
          <div class="animal-editor-media">
            <h2>Photos & Video</h2>
            <div class="animal-editor-media-grid">
              {detail.media.map((m) => (
                <div key={m.id} class="animal-editor-media-item">
                  {m.media_type === 'video' ? (
                    <video src={m.url} controls />
                  ) : (
                    <img src={m.url} alt={`${detail.name} photo`} loading="lazy" />
                  )}
                  <button type="button" onClick={() => handleDeleteMedia(m.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <FileDropZone
              accept="image/*,video/*"
              label={uploading ? 'Uploading…' : 'Add a photo or video'}
              onFileSelected={(file) =>
                handleUpload(file, file.type.startsWith('video/') ? 'video' : 'image')
              }
            />
          </div>
        )}

        <style>{ANIMAL_EDITOR_STYLES}</style>
      </div>
    );
  }

  return (
    <div class="animal-editor-list-wrap">
      <div class="animal-editor-list-head">
        <h1>Animals</h1>
        <button
          type="button"
          class="animal-editor-add-btn"
          onClick={() => {
            setDetail(null);
            setForm(BLANK_FORM);
            setEditingId('new');
          }}
        >
          + Add Animal
        </button>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table class="animal-editor-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {animals.map((animal, i) => (
              <tr key={animal.id}>
                <td>{animal.name}</td>
                <td>{animal.status}</td>
                <td class="animal-editor-order-cell">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${animal.name} up`}
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    disabled={i === animals.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${animal.name} down`}
                  >
                    &darr;
                  </button>
                </td>
                <td class="animal-editor-actions-cell">
                  <button type="button" onClick={() => setEditingId(animal.id)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    class="animal-editor-delete-btn"
                    onClick={() => handleDelete(animal)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style>{ANIMAL_EDITOR_STYLES}</style>
    </div>
  );
}

const ANIMAL_EDITOR_STYLES = `
  .animal-editor-list-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .animal-editor-list-head h1,
  .animal-editor-heading {
    font-family: var(--font-heading);
    color: var(--color-heading);
  }
  .animal-editor-add-btn,
  .animal-editor-save-btn {
    background: var(--color-accent);
    color: var(--color-surface);
    font-family: var(--font-heading);
    font-weight: 600;
    border: none;
    border-radius: var(--radius-pill);
    padding: 10px 20px;
    cursor: pointer;
  }
  .animal-editor-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--color-surface);
    border-radius: var(--radius-card);
    overflow: hidden;
  }
  .animal-editor-table th,
  .animal-editor-table td {
    text-align: left;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
    font-size: 14px;
  }
  .animal-editor-order-cell button,
  .animal-editor-actions-cell button {
    background: var(--color-surface-alt);
    border: none;
    border-radius: var(--radius-input);
    padding: 6px 10px;
    margin-right: 6px;
    cursor: pointer;
  }
  .animal-editor-delete-btn {
    color: var(--color-danger);
  }
  .animal-editor-back-btn {
    background: none;
    border: none;
    color: var(--color-accent);
    cursor: pointer;
    padding: 0;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .animal-editor-error {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-radius: var(--radius-input);
    padding: 10px 12px;
    margin-bottom: 12px;
  }
  .animal-editor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    background: var(--color-surface);
    padding: 20px;
    border-radius: var(--radius-card);
  }
  .animal-editor-grid label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-family: var(--font-heading);
    font-weight: 600;
    color: var(--color-heading);
  }
  .animal-editor-span {
    grid-column: 1 / -1;
  }
  .animal-editor-grid input,
  .animal-editor-grid select,
  .animal-editor-grid textarea {
    font-family: var(--font-body);
    font-weight: 400;
    padding: 10px 12px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--color-border);
    font-size: 14px;
  }
  .animal-editor-save-btn {
    margin-top: 16px;
  }
  .animal-editor-media {
    margin-top: 30px;
  }
  .animal-editor-media h2 {
    font-family: var(--font-heading);
    color: var(--color-heading);
    font-size: 18px;
  }
  .animal-editor-media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 14px;
  }
  .animal-editor-media-item {
    background: var(--color-surface);
    border-radius: var(--radius-input);
    padding: 8px;
    text-align: center;
  }
  .animal-editor-media-item img,
  .animal-editor-media-item video {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: var(--radius-input);
    margin-bottom: 6px;
  }
  .animal-editor-media-item button {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border: none;
    border-radius: var(--radius-input);
    padding: 6px 10px;
    cursor: pointer;
    font-size: 12px;
  }
`;
