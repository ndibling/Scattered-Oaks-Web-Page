import type { SiteContent } from '../lib/types';

type Props = {
  content: SiteContent;
};

export default function Footer({ content }: Props) {
  return (
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          {/* [AMENDED] 2026-07-22 (M6) — reads site_content['site.logo_url'], same key as Header.tsx. */}
          <img
            src={content['site.logo_url'] ?? '/uploads/Scattered Oaks Logo-eb6f247a.png'}
            alt=""
            class="footer-logo"
          />
          <div>
            <div class="footer-name">{content['site.farm_name']}</div>
            <div class="footer-dba">{content['site.dba_line']}</div>
          </div>
        </div>
        <div class="footer-social">
          <a
            href={content['gallery.facebook_url']}
            target="_blank"
            rel="noopener"
            class="fb-icon"
            aria-label={content['gallery.facebook_label']}
          >
            FB
          </a>
        </div>
      </div>

      <style>{`
        .footer {
          padding: 44px 28px;
          background: var(--color-footer);
          color: color-mix(in oklch, var(--color-surface) 90%, transparent);
        }
        .footer-inner {
          max-width: var(--container-max);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .footer-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .footer-logo {
          width: 270px;
          height: 270px;
          border-radius: 50%;
          object-fit: cover;
          flex: none;
        }
        .footer-name {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 4px;
        }
        .footer-dba {
          font-size: 13px;
          color: color-mix(in oklch, var(--color-surface) 70%, transparent);
        }
        .fb-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-pill);
          background: color-mix(in oklch, var(--color-footer) 60%, white 40%);
          color: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 13px;
        }
      `}</style>
    </footer>
  );
}
