import type { SiteContent } from '../lib/types';

type Props = {
  content: SiteContent;
};

// [AMENDED] 2026-07-22 (M6) — photo now reads from site_content['hero.photo_url']
// (admin-replaceable via ContentEditor) instead of a hardcoded path.

export default function Hero({ content }: Props) {
  return (
    <section id="home" class="hero">
      <div class="hero-inner">
        <div>
          <div class="hero-eyebrow">{content['hero.eyebrow']}</div>
          <h1 class="hero-headline">{content['hero.headline']}</h1>
          <p class="hero-intro">{content['hero.intro']}</p>
          <div class="hero-cta-row">
            <a href="#animals" class="hero-cta-primary">
              {content['hero.cta_primary']}
            </a>
            <a href="#about" class="hero-cta-secondary">
              {content['hero.cta_secondary']}
            </a>
          </div>
        </div>
        <div class="hero-photo-wrap">
          <div class="hero-photo">
            <img
              src={content['hero.photo_url'] ?? '/uploads/Scattered Oaks Farm 3.jpg'}
              alt="Zebu herd running across the pasture"
            />
          </div>
          <div class="hero-badge">🐂 {content['hero.badge']}</div>
        </div>
      </div>

      <style>{`
        .hero {
          position: relative;
          padding: 90px 28px 80px;
          background: linear-gradient(180deg, var(--color-surface-alt) 0%, var(--color-background) 100%);
          overflow: hidden;
        }
        .hero-inner {
          max-width: var(--container-max);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(280px, 1fr) minmax(320px, 1fr);
          gap: 48px;
          align-items: center;
        }
        .hero-eyebrow {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--color-accent2);
          margin-bottom: 14px;
        }
        .hero-headline {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: clamp(36px, 5vw, 58px);
          line-height: 1.05;
          margin: 0 0 18px;
          color: var(--color-heading);
        }
        .hero-intro {
          font-size: 19px;
          line-height: 1.6;
          color: var(--color-text-body);
          max-width: 520px;
          margin: 0 0 28px;
        }
        .hero-cta-row {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .hero-cta-primary {
          background: var(--color-accent);
          color: var(--color-surface);
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 16px;
          padding: 14px 28px;
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-cta);
        }
        .hero-cta-secondary {
          background: transparent;
          border: 2px solid var(--color-accent2);
          color: var(--color-accent2-text);
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 16px;
          padding: 12px 26px;
          border-radius: var(--radius-pill);
        }
        .hero-photo-wrap {
          position: relative;
        }
        .hero-photo {
          aspect-ratio: 4 / 3;
          border-radius: var(--radius-card-lg);
          overflow: hidden;
          box-shadow: var(--shadow-hero-photo);
        }
        .hero-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hero-badge {
          position: absolute;
          bottom: -18px;
          left: -18px;
          background: var(--color-accent2-bright);
          color: var(--color-surface);
          font-family: var(--font-heading);
          font-weight: 700;
          padding: 14px 20px;
          border-radius: 16px;
          font-size: 15px;
          transform: rotate(-4deg);
          animation: bob 4s ease-in-out infinite;
          box-shadow: var(--shadow-badge);
        }

        /* [ADDED] — .hero-inner's two fixed-minimum grid tracks (280px + 320px + gap)
           need 650px+ combined, well past a phone viewport, forcing the whole page
           to overflow horizontally. Stack to one column below tablet width. */
        @media (max-width: 768px) {
          .hero {
            padding: 60px 20px 56px;
          }
          .hero-inner {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
      `}</style>
    </section>
  );
}
