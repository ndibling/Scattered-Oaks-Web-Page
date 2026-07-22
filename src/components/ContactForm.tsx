import type { Animal, SiteContent } from '../lib/types';

type Props = {
  content: SiteContent;
  animals: Animal[];
  selectedAnimal: string;
  onSelectedAnimalChange: (name: string) => void;
  submitted: boolean;
  onSubmit: () => void;
};

export default function ContactForm({
  content,
  animals,
  selectedAnimal,
  onSelectedAnimalChange,
  submitted,
  onSubmit,
}: Props) {
  const inquiryOptions = animals.filter((a) => a.status !== 'not-for-sale').map((a) => a.name);

  return (
    <section id="contact-form" class="contact-section">
      <div class="contact-inner">
        <div class="contact-head">
          <div class="contact-eyebrow">{content['contact.eyebrow']}</div>
          <h2 class="contact-heading">{content['contact.heading']}</h2>
          <p class="contact-subheading">{content['contact.subheading']}</p>
        </div>

        {submitted ? (
          <div class="contact-thankyou">
            <div class="contact-thankyou-emoji">🤠</div>
            <h3 class="contact-thankyou-heading">{content['contact.thankyou_heading']}</h3>
            <p class="contact-thankyou-body">{content['contact.thankyou_body']}</p>
          </div>
        ) : (
          <form
            class="contact-form"
            onSubmit={(e) => {
              e.preventDefault();
              // Real submission (POST /api/contact + Turnstile verification) lands in M7.
              onSubmit();
            }}
          >
            <div class="contact-field">
              <label for="contact-name">{content['contact.label_name']}</label>
              <input id="contact-name" required type="text" placeholder="Your name" />
            </div>
            <div class="contact-field">
              <label for="contact-email">{content['contact.label_email']}</label>
              <input id="contact-email" required type="email" placeholder="you@example.com" />
            </div>
            <div class="contact-field">
              <label for="contact-animal">{content['contact.label_interested_in']}</label>
              <select
                id="contact-animal"
                value={selectedAnimal}
                onChange={(e) => onSelectedAnimalChange((e.target as HTMLSelectElement).value)}
              >
                <option value="">General Inquiry</option>
                {inquiryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div class="contact-field">
              <label for="contact-message">{content['contact.label_message']}</label>
              <textarea
                id="contact-message"
                required
                placeholder="Tell us a bit about what you're looking for..."
                rows={5}
              />
            </div>
            <button type="submit" class="contact-submit-btn">
              {content['contact.label_submit']}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .contact-section {
          padding: 80px 28px;
          background: var(--color-accent-deep);
        }
        .contact-inner {
          max-width: var(--container-narrow);
          margin: 0 auto;
        }
        .contact-head {
          text-align: center;
          margin-bottom: 30px;
        }
        .contact-eyebrow {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: color-mix(in oklch, var(--color-accent2-border) 85%, white 15%);
        }
        .contact-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: clamp(28px, 3.5vw, 38px);
          margin: 8px 0 12px;
          color: var(--color-surface);
        }
        .contact-subheading {
          font-size: 16px;
          color: color-mix(in oklch, var(--color-surface) 90%, var(--color-accent) 10%);
        }
        .contact-thankyou {
          background: var(--color-surface);
          border-radius: var(--radius-modal);
          padding: 40px;
          text-align: center;
        }
        .contact-thankyou-emoji {
          font-size: 40px;
          margin-bottom: 12px;
        }
        .contact-thankyou-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 22px;
          margin: 0 0 8px;
          color: var(--color-heading);
        }
        .contact-thankyou-body {
          font-size: 15px;
          color: var(--color-text-body);
          margin: 0;
        }
        .contact-form {
          background: var(--color-surface);
          border-radius: var(--radius-modal);
          padding: 34px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .contact-field label {
          display: block;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 6px;
          color: var(--color-heading);
        }
        .contact-field input,
        .contact-field select,
        .contact-field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: var(--radius-input);
          border: 1.5px solid var(--color-border);
          font-size: 15px;
          font-family: var(--font-body);
          background: var(--color-surface);
        }
        .contact-field textarea {
          resize: vertical;
        }
        .contact-submit-btn {
          margin-top: 6px;
          background: var(--color-accent);
          color: var(--color-surface);
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 16px;
          padding: 14px 0;
          border: none;
          border-radius: var(--radius-pill);
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
