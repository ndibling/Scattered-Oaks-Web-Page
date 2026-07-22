import type { GalleryPhoto, SiteContent } from '../lib/types';

type Props = {
  content: SiteContent;
  photos: GalleryPhoto[];
  galleryStyle: 'grid' | 'mosaic';
  onOpenPhoto: (photo: GalleryPhoto) => void;
};

export default function GallerySection({ content, photos, galleryStyle, onOpenPhoto }: Props) {
  return (
    <section id="gallery" class="gallery-section">
      <div class="gallery-inner">
        <div class="gallery-head">
          <div class="gallery-eyebrow">{content['gallery.eyebrow']}</div>
          <h2 class="gallery-heading">{content['gallery.heading']}</h2>
          <p class="gallery-fb-line">
            More on Facebook{' '}
            <a
              href={content['gallery.facebook_url']}
              target="_blank"
              rel="noopener"
              class="gallery-fb-link"
            >
              {content['gallery.facebook_label']}
            </a>
          </p>
        </div>
        <div
          class={galleryStyle === 'mosaic' ? 'gallery-grid gallery-grid-mosaic' : 'gallery-grid'}
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              class="gallery-tile"
              onDblClick={() => onOpenPhoto(photo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpenPhoto(photo);
              }}
              aria-label={`View photo: ${photo.label}`}
            >
              <img src={photo.url} alt={photo.label} />
              <div class="gallery-tile-label">{photo.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .gallery-section {
          padding: 80px 28px;
          background: var(--color-surface);
        }
        .gallery-inner {
          max-width: var(--container-max);
          margin: 0 auto;
        }
        .gallery-head {
          text-align: center;
          margin-bottom: 36px;
        }
        .gallery-eyebrow {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--color-accent);
        }
        .gallery-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: clamp(28px, 3.5vw, 40px);
          margin: 8px 0 12px;
          color: var(--color-heading);
        }
        .gallery-fb-line {
          font-size: 16px;
          color: var(--color-text-body);
        }
        .gallery-fb-link {
          font-weight: 700;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .gallery-grid-mosaic {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }
        .gallery-tile {
          aspect-ratio: 1 / 1;
          border-radius: var(--radius-card-sm);
          overflow: hidden;
          position: relative;
          cursor: pointer;
        }
        .gallery-tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-tile-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(0deg, color-mix(in oklch, var(--color-modal-media) 75%, transparent), transparent);
          color: var(--color-surface);
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 13px;
          padding: 20px 12px 10px;
        }
      `}</style>
    </section>
  );
}
