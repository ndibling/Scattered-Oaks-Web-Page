import { useState, useEffect } from 'preact/hooks';
import type { AnimalDetail } from '../lib/types';
import { STATUS_BADGE, formatPrice } from '../lib/types';
import { useFocusTrap } from '../lib/useFocusTrap';

type Props = {
  animal: AnimalDetail;
  showPublicPrices: boolean;
  onClose: () => void;
  onAskAbout: (name: string) => void;
};

export default function AnimalDetailModal({
  animal,
  showPublicPrices,
  onClose,
  onAskAbout,
}: Props) {
  const dialogRef = useFocusTrap<HTMLDivElement>();
  const [photoIdx, setPhotoIdx] = useState(0);
  const media = animal.media;
  const hasMedia = media.length > 0;
  const safeIdx = hasMedia ? photoIdx % media.length : 0;
  const current = hasMedia ? media[safeIdx] : null;
  const canInquire = animal.status !== 'not-for-sale';
  const priceLabel = formatPrice(animal.price_cents, showPublicPrices);
  const parentsLine =
    animal.sire_registered_name || animal.dam_registered_name
      ? `${animal.sire_registered_name ?? 'Unknown sire'} x ${animal.dam_registered_name ?? 'Unknown dam'}`
      : 'Ask Heather';

  const next = () => setPhotoIdx((i) => (i + 1) % media.length);
  const prev = () => setPhotoIdx((i) => (i - 1 + media.length) % media.length);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && media.length > 1) next();
      if (e.key === 'ArrowLeft' && media.length > 1) prev();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [media.length]);

  return (
    <div
      class="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${animal.name} details`}
    >
      <div class="modal-dialog" ref={dialogRef} onClick={(e) => e.stopPropagation()}>
        <div class="modal-media-pane">
          {current?.media_type === 'video' ? (
            <video key={current.url} src={current.url} controls playsInline preload="auto" />
          ) : current ? (
            <img src={current.url} alt={animal.name} loading="lazy" />
          ) : (
            <div class="modal-no-photo">No photo available</div>
          )}
          {media.length > 1 && (
            <>
              <button
                type="button"
                class="modal-nav-btn modal-nav-prev"
                onClick={prev}
                aria-label="Previous photo"
              >
                &larr;
              </button>
              <button
                type="button"
                class="modal-nav-btn modal-nav-next"
                onClick={next}
                aria-label="Next photo"
              >
                &rarr;
              </button>
              <div class="modal-photo-counter">
                {safeIdx + 1} / {media.length}
              </div>
            </>
          )}
        </div>
        <div class="modal-info-pane">
          <div class="modal-info-head">
            <h3 class="modal-name">{animal.name}</h3>
            <button type="button" class="modal-close-btn" onClick={onClose} aria-label="Close">
              &times;
            </button>
          </div>
          <div class={`modal-badge modal-badge-${animal.status}`}>
            {STATUS_BADGE[animal.status].label}
          </div>
          <div class="modal-sex-age">
            {animal.sex} &middot; {animal.age_text}
          </div>
          {priceLabel && <div class="modal-price">{priceLabel}</div>}
          <p class="modal-blurb">{animal.description}</p>
          <div class="modal-reg-grid">
            <div>
              <div class="modal-reg-label">Barn Name</div>
              <div class="modal-reg-value">{animal.name}</div>
            </div>
            <div>
              <div class="modal-reg-label">Registered Name</div>
              <div class="modal-reg-value">{animal.registered_name ?? 'Ask Heather'}</div>
            </div>
            <div>
              <div class="modal-reg-label">IMZA#</div>
              <div class="modal-reg-value">{animal.imza_number ?? 'Ask Heather'}</div>
            </div>
            <div>
              <div class="modal-reg-label">Expected Height</div>
              <div class="modal-reg-value">{animal.expected_height ?? 'Ask Heather'}</div>
            </div>
            <div class="modal-reg-span">
              <div class="modal-reg-label">Parents (Registered)</div>
              <div class="modal-reg-value">{parentsLine}</div>
            </div>
          </div>
          {canInquire ? (
            <a href="#contact-form" class="modal-ask-cta" onClick={() => onAskAbout(animal.name)}>
              Ask About {animal.name}
            </a>
          ) : (
            <div class="modal-permanent-herd">Part of our permanent herd</div>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: var(--color-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .modal-dialog {
          background: var(--color-surface);
          border-radius: var(--radius-modal);
          max-width: var(--container-modal);
          width: 100%;
          max-height: 90vh;
          overflow: auto;
          display: grid;
          grid-template-columns: minmax(280px, 1.3fr) minmax(260px, 1fr);
        }
        .modal-media-pane {
          position: relative;
          background: var(--color-modal-media);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 320px;
        }
        .modal-media-pane img,
        .modal-media-pane video {
          width: 100%;
          height: 100%;
          max-height: 70vh;
          object-fit: contain;
        }
        .modal-media-pane video {
          background: #000;
        }
        .modal-no-photo {
          color: color-mix(in oklch, var(--color-surface) 80%, transparent);
          font-family: var(--font-mono);
          font-size: 13px;
        }
        .modal-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border-radius: var(--radius-pill);
          border: none;
          background: color-mix(in oklch, var(--color-surface) 85%, transparent);
          font-size: 18px;
          cursor: pointer;
        }
        .modal-nav-prev {
          left: 12px;
        }
        .modal-nav-next {
          right: 12px;
        }
        .modal-photo-counter {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: color-mix(in oklch, var(--color-modal-media) 60%, transparent);
          color: var(--color-surface);
          font-size: 12px;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
        }
        .modal-info-pane {
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .modal-info-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .modal-name {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 26px;
          margin: 0;
          color: var(--color-heading);
        }
        .modal-close-btn {
          border: none;
          background: var(--color-surface-alt);
          width: 32px;
          height: 32px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          font-size: 16px;
        }
        .modal-badge {
          display: inline-block;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 12px;
          padding: 5px 12px;
          border-radius: var(--radius-pill);
          width: fit-content;
        }
        .modal-badge-for-sale {
          background: var(--color-status-for-sale-bg);
          color: var(--color-status-for-sale-text);
        }
        .modal-badge-pending {
          background: var(--color-status-pending-bg);
          color: var(--color-status-pending-text);
        }
        .modal-badge-coming-soon {
          background: var(--color-status-coming-soon-bg);
          color: var(--color-status-coming-soon-text);
        }
        .modal-badge-not-for-sale {
          background: var(--color-status-not-for-sale-bg);
          color: var(--color-status-not-for-sale-text);
        }
        .modal-sex-age {
          font-size: 15px;
          color: var(--color-text-muted);
        }
        .modal-price {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 22px;
          color: var(--color-accent2);
        }
        .modal-blurb {
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-text-muted);
        }
        .modal-reg-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
          background: var(--color-background);
          border-radius: 12px;
          padding: 14px 16px;
          margin: 4px 0;
        }
        .modal-reg-span {
          grid-column: 1 / -1;
        }
        .modal-reg-label {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: var(--color-accent);
        }
        .modal-reg-value {
          font-size: 14px;
          color: var(--color-text-body);
        }
        .modal-ask-cta {
          margin-top: auto;
          text-align: center;
          background: var(--color-accent);
          color: var(--color-surface);
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 15px;
          padding: 12px 0;
          border-radius: var(--radius-pill);
        }
        .modal-permanent-herd {
          margin-top: auto;
          text-align: center;
          font-size: 13px;
          color: var(--color-text-muted);
          font-style: italic;
          padding: 10px 0;
        }
      `}</style>
    </div>
  );
}
