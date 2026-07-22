import type { SiteContent } from '../lib/types';

type Props = {
  content: SiteContent;
};

export default function Header({ content }: Props) {
  const farmName = content['site.farm_name'] ?? 'Scattered Oaks Farms';
  const words = farmName.split(' ');
  const lastWord = words.pop();
  const rest = words.join(' ');

  return (
    <header class="header">
      <div class="header-inner">
        <a href="#home" class="brand" aria-label={farmName}>
          {/* [AMENDED] 2026-07-22 (M6) — reads site_content['site.logo_url'], admin-replaceable via ContentEditor. */}
          <img
            src={content['site.logo_url'] ?? '/uploads/Scattered Oaks Logo-eb6f247a.png'}
            alt=""
            class="brand-logo"
          />
          {rest} <span class="brand-accent">{lastWord}</span>
        </a>
        <nav class="nav" aria-label="Primary">
          <a href="#home">{content['nav.home'] ?? 'Home'}</a>
          <a href="#about">{content['nav.about'] ?? 'About'}</a>
          <a href="#animals">{content['nav.animals'] ?? 'Available Animals'}</a>
          <a href="#gallery">{content['nav.gallery'] ?? 'Gallery'}</a>
          <a href="#contact-form" class="nav-cta">
            {content['nav.contact'] ?? 'Contact'}
          </a>
        </nav>
      </div>

      <style>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: color-mix(in oklch, var(--color-background) 94%, transparent);
          backdrop-filter: blur(6px);
          border-bottom: 2px solid color-mix(in oklch, var(--color-accent2-border) 40%, transparent);
        }
        .header-inner {
          max-width: var(--container-max);
          margin: 0 auto;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 20px;
          color: var(--color-accent-hover);
          letter-spacing: 0.2px;
        }
        .brand-logo {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
        }
        .brand-accent {
          color: var(--color-accent2-bright);
        }
        .nav {
          display: flex;
          align-items: center;
          gap: 26px;
          flex-wrap: wrap;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 15px;
        }
        .nav a {
          color: var(--color-text-primary);
        }
        .nav-cta {
          background: var(--color-accent);
          color: var(--color-surface) !important;
          padding: 8px 16px;
          border-radius: var(--radius-pill);
        }
      `}</style>
    </header>
  );
}
