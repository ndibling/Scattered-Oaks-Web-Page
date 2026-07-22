import type { SiteContent } from '../lib/types';

type Props = {
  content: SiteContent;
};

export default function About({ content }: Props) {
  const stats = [1, 2, 3].map((n) => ({
    value: content[`about.stat_${n}_value`],
    label: content[`about.stat_${n}_label`],
  }));

  return (
    <section id="about" class="about">
      <div class="about-inner">
        <div class="about-photo">
          {/* [AMENDED] 2026-07-22 (M6) — reads site_content['about.photo_url'], admin-replaceable via ContentEditor. */}
          <img
            src={content['about.photo_url'] ?? '/uploads/Scattered Oaks Farm.jpg'}
            alt="Evening at Scattered Oaks Farms"
          />
        </div>
        <div>
          <div class="about-eyebrow">{content['about.eyebrow']}</div>
          <h2 class="about-heading">{content['about.heading']}</h2>
          <p class="about-paragraph">{content['about.paragraph_1']}</p>
          <p class="about-paragraph about-paragraph-last">{content['about.paragraph_2']}</p>
          <div class="about-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div class="about-stat-value">{stat.value}</div>
                <div class="about-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .about {
          padding: 80px 28px;
          background: var(--color-surface);
        }
        .about-inner {
          max-width: var(--container-max);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.2fr);
          gap: 52px;
          align-items: center;
        }
        .about-photo {
          aspect-ratio: 1 / 1;
          border-radius: var(--radius-card-lg);
          overflow: hidden;
        }
        .about-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .about-eyebrow {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--color-accent);
          margin-bottom: 10px;
        }
        .about-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: clamp(28px, 3.5vw, 40px);
          margin: 0 0 18px;
          color: var(--color-heading);
        }
        .about-paragraph {
          font-size: 17px;
          line-height: 1.7;
          color: var(--color-text-body);
          margin: 0 0 16px;
        }
        .about-paragraph-last {
          margin: 0;
        }
        .about-stats {
          display: flex;
          gap: 28px;
          margin-top: 28px;
          flex-wrap: wrap;
        }
        .about-stat-value {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 26px;
          color: var(--color-accent);
        }
        .about-stat-label {
          font-size: 13px;
          color: var(--color-text-muted);
        }
      `}</style>
    </section>
  );
}
