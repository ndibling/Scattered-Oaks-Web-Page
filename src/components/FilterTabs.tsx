import { FILTER_TABS, type FilterKey } from '../lib/types';

type Props = {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
};

export default function FilterTabs({ active, onChange }: Props) {
  return (
    <div class="filter-tabs" role="tablist" aria-label="Filter animals by status">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          class={active === tab.key ? 'tab tab-active' : 'tab'}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}

      <style>{`
        .filter-tabs {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          margin: 28px 0 36px;
        }
        .tab {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 14px;
          padding: 9px 20px;
          border-radius: var(--radius-pill);
          border: 2px solid var(--color-accent);
          cursor: pointer;
          background: transparent;
          color: var(--color-accent-hover);
        }
        .tab-active {
          background: var(--color-accent);
          color: var(--color-surface);
        }
      `}</style>
    </div>
  );
}
