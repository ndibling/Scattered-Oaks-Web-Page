import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import type { SiteSettings } from '../lib/types';

export default function SiteSettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings().then(setSettings);
  }, []);

  async function toggleShowPrices() {
    if (!settings) return;
    setSaving(true);
    const updated = await api.updateSettings({ showPublicPrices: !settings.showPublicPrices });
    setSettings(updated);
    setSaving(false);
  }

  async function setGalleryStyle(galleryStyle: SiteSettings['galleryStyle']) {
    if (!settings) return;
    setSaving(true);
    const updated = await api.updateSettings({ galleryStyle });
    setSettings(updated);
    setSaving(false);
  }

  if (!settings) return <p>Loading…</p>;

  return (
    <div class="site-settings-panel">
      <h1 class="site-settings-heading">Settings</h1>

      <div class="site-settings-row">
        <div>
          <div class="site-settings-label">Show Prices Publicly</div>
          <div class="site-settings-hint">
            When off, the public site shows "Inquire" instead of a price.
          </div>
        </div>
        <button
          type="button"
          class={`site-settings-toggle${settings.showPublicPrices ? ' site-settings-toggle-on' : ''}`}
          onClick={toggleShowPrices}
          disabled={saving}
          role="switch"
          aria-checked={settings.showPublicPrices}
          aria-label="Show Prices Publicly"
        >
          <span class="site-settings-toggle-knob" />
        </button>
      </div>

      <div class="site-settings-row">
        <div>
          <div class="site-settings-label">Gallery Layout</div>
          <div class="site-settings-hint">Grid or mosaic layout for the public gallery.</div>
        </div>
        <select
          value={settings.galleryStyle}
          disabled={saving}
          onChange={(e) =>
            setGalleryStyle((e.target as HTMLSelectElement).value as SiteSettings['galleryStyle'])
          }
        >
          <option value="grid">Grid</option>
          <option value="mosaic">Mosaic</option>
        </select>
      </div>

      <style>{`
        .site-settings-heading {
          font-family: var(--font-heading);
          color: var(--color-heading);
        }
        .site-settings-row {
          background: var(--color-surface);
          border-radius: var(--radius-card);
          padding: 16px 20px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          max-width: 560px;
        }
        .site-settings-label {
          font-family: var(--font-heading);
          font-weight: 600;
          color: var(--color-heading);
        }
        .site-settings-hint {
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .site-settings-toggle {
          width: 46px;
          height: 26px;
          border-radius: var(--radius-pill);
          border: none;
          background: var(--color-border);
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
        }
        .site-settings-toggle-on {
          background: var(--color-accent);
        }
        .site-settings-toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-surface);
          transition: left 0.15s ease;
        }
        .site-settings-toggle-on .site-settings-toggle-knob {
          left: 23px;
        }
        .site-settings-row select {
          padding: 8px 10px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
        }
      `}</style>
    </div>
  );
}
