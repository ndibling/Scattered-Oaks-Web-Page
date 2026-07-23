import type { Animal, FilterKey, SiteContent } from '../lib/types';
import FilterTabs from './FilterTabs';
import AnimalCard from './AnimalCard';

type Props = {
  content: SiteContent;
  animals: Animal[];
  activeFilter: FilterKey;
  onFilterChange: (key: FilterKey) => void;
  showPublicPrices: boolean;
  onOpenAnimal: (id: string) => void;
  onAskAbout: (name: string) => void;
};

export default function AnimalGrid({
  content,
  animals,
  activeFilter,
  onFilterChange,
  showPublicPrices,
  onOpenAnimal,
  onAskAbout,
}: Props) {
  const filtered =
    activeFilter === 'all'
      ? animals
      : activeFilter === 'not-for-sale'
        ? animals.filter((a) => a.status === 'not-for-sale')
        : animals.filter((a) => a.status === activeFilter);

  return (
    <section id="animals" class="animals-section">
      <div class="animals-inner">
        <div class="animals-head">
          <div class="animals-eyebrow">{content['animals.eyebrow']}</div>
          <h2 class="animals-heading">{content['animals.heading']}</h2>
          <p class="animals-subheading">{content['animals.subheading']}</p>
        </div>

        <FilterTabs active={activeFilter} onChange={onFilterChange} />

        <div class="animals-grid">
          {filtered.map((animal) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              showPublicPrices={showPublicPrices}
              onOpen={onOpenAnimal}
              onAskAbout={onAskAbout}
            />
          ))}
        </div>
      </div>

      <style>{`
        .animals-section {
          padding: 80px 28px;
          background: var(--color-surface-alt);
        }
        .animals-inner {
          max-width: var(--container-max);
          margin: 0 auto;
        }
        .animals-head {
          text-align: center;
          margin-bottom: 14px;
        }
        .animals-eyebrow {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--color-accent);
        }
        .animals-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: clamp(28px, 3.5vw, 40px);
          margin: 8px 0 12px;
          color: var(--color-heading);
        }
        .animals-subheading {
          font-size: 16px;
          color: var(--color-text-body);
          max-width: 560px;
          margin: 0 auto;
        }
        .animals-grid {
          display: grid;
          /* min(270px, 100%) keeps the smallest phones (~320px, minus padding)
             from overflowing — a bare 270px minimum doesn't fit there. */
          grid-template-columns: repeat(auto-fit, minmax(min(270px, 100%), 1fr));
          gap: 26px;
        }
      `}</style>
    </section>
  );
}
