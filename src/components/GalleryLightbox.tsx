import { useEffect } from 'preact/hooks';
import type { GalleryPhoto } from '../lib/types';
import { useFocusTrap } from '../lib/useFocusTrap';

type Props = {
  photo: GalleryPhoto;
  onClose: () => void;
};

export default function GalleryLightbox({ photo, onClose }: Props) {
  const dialogRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      class="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.label}
    >
      <div class="lightbox-dialog" ref={dialogRef} onClick={(e) => e.stopPropagation()}>
        <div class="lightbox-media-pane">
          <img src={photo.url} alt={photo.label} loading="lazy" />
          <button type="button" class="lightbox-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div class="lightbox-caption">
          <h3 class="lightbox-label">{photo.label}</h3>
          <p class="lightbox-description">{photo.description}</p>
        </div>
      </div>

      <style>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: var(--color-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .lightbox-dialog {
          background: var(--color-surface);
          border-radius: var(--radius-modal);
          max-width: var(--container-gallery-modal);
          width: 100%;
          max-height: 90vh;
          overflow: auto;
        }
        .lightbox-media-pane {
          position: relative;
          background: var(--color-modal-media);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 320px;
        }
        .lightbox-media-pane img {
          width: 100%;
          max-height: 65vh;
          object-fit: contain;
        }
        .lightbox-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          border: none;
          background: color-mix(in oklch, var(--color-surface) 85%, transparent);
          width: 32px;
          height: 32px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          font-size: 16px;
        }
        .lightbox-caption {
          padding: 24px 28px;
        }
        .lightbox-label {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 22px;
          margin: 0 0 8px;
          color: var(--color-heading);
        }
        .lightbox-description {
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-text-muted);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
