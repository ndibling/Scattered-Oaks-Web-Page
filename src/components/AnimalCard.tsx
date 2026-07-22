import type { Animal } from '../lib/types';
import { STATUS_BADGE, formatPrice } from '../lib/types';

type Props = {
  animal: Animal;
  showPublicPrices: boolean;
  onOpen: (id: string) => void;
  onAskAbout: (name: string) => void;
};

export default function AnimalCard({ animal, showPublicPrices, onOpen, onAskAbout }: Props) {
  const canInquire = animal.status !== 'not-for-sale';
  const priceLabel = formatPrice(animal.price_cents, showPublicPrices);

  return (
    <div
      class="card"
      onDblClick={() => onOpen(animal.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(animal.id);
      }}
      aria-label={`View details for ${animal.name}`}
    >
      <div class="card-photo">
        {animal.primary_image_url ? (
          <img src={animal.primary_image_url} alt={animal.name} />
        ) : (
          <div class="card-photo-placeholder">PHOTO: {animal.name}</div>
        )}
        <div class={`card-badge card-badge-${animal.status}`}>
          {STATUS_BADGE[animal.status].label}
        </div>
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-name">{animal.name}</h3>
          {priceLabel && <span class="card-price">{priceLabel}</span>}
        </div>
        <div class="card-meta">
          {animal.type} &middot; {animal.age_text}
        </div>
        <p class="card-blurb">{animal.description}</p>
        {canInquire ? (
          <a
            href="#contact-form"
            class="card-ask-cta"
            onClick={(e) => {
              e.stopPropagation();
              onAskAbout(animal.name);
            }}
          >
            Ask About {animal.name}
          </a>
        ) : (
          <div class="card-permanent-herd">Part of our permanent herd</div>
        )}
      </div>

      <style>{`
        .card {
          background: var(--color-surface);
          border-radius: var(--radius-card);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }
        .card-photo {
          aspect-ratio: 4 / 3;
          background: repeating-linear-gradient(
            135deg,
            var(--color-surface-alt) 0 20px,
            color-mix(in oklch, var(--color-surface-alt) 90%, black 4%) 20px 40px
          );
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .card-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-photo-placeholder {
          background: color-mix(in oklch, var(--color-surface) 90%, transparent);
          padding: 8px 14px;
          border-radius: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-text-body);
        }
        .card-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 12px;
          padding: 5px 12px;
          border-radius: var(--radius-pill);
        }
        .card-badge-for-sale {
          background: var(--color-status-for-sale-bg);
          color: var(--color-status-for-sale-text);
        }
        .card-badge-pending {
          background: var(--color-status-pending-bg);
          color: var(--color-status-pending-text);
        }
        .card-badge-coming-soon {
          background: var(--color-status-coming-soon-bg);
          color: var(--color-status-coming-soon-text);
        }
        .card-badge-not-for-sale {
          background: var(--color-status-not-for-sale-bg);
          color: var(--color-status-not-for-sale-text);
        }
        .card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .card-title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .card-name {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 20px;
          margin: 0;
          color: var(--color-heading);
        }
        .card-price {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 17px;
          color: var(--color-accent2);
        }
        .card-meta {
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .card-blurb {
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-muted);
          margin: 8px 0 14px;
        }
        .card-ask-cta {
          margin-top: auto;
          text-align: center;
          background: var(--color-accent);
          color: var(--color-surface);
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          padding: 10px 0;
          border-radius: var(--radius-pill);
        }
        .card-permanent-herd {
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
