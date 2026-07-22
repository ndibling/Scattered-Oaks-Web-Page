import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import type { AuditLogEntry } from '../lib/types';

const PAGE_SIZE = 50;

export default function AuditLogView() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .audit(PAGE_SIZE, offset)
      .then((page) => {
        setEntries(page.results);
        setHasMore(page.hasMore);
      })
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div class="audit-log-view">
      <h1 class="audit-log-heading">Activity Log</h1>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table class="audit-log-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleString()}</td>
                <td>{entry.admin_username ?? 'deleted administrator'}</td>
                <td>{entry.action}</td>
                <td>{entry.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div class="audit-log-pager">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          &larr; Newer
        </button>
        <button type="button" disabled={!hasMore} onClick={() => setOffset(offset + PAGE_SIZE)}>
          Older &rarr;
        </button>
      </div>

      <style>{`
        .audit-log-heading {
          font-family: var(--font-heading);
          color: var(--color-heading);
        }
        .audit-log-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--color-surface);
          border-radius: var(--radius-card);
        }
        .audit-log-table th,
        .audit-log-table td {
          text-align: left;
          padding: 10px 14px;
          border-bottom: 1px solid var(--color-border);
          font-size: 13px;
        }
        .audit-log-pager {
          display: flex;
          justify-content: space-between;
          margin-top: 14px;
        }
        .audit-log-pager button {
          background: var(--color-surface-alt);
          border: none;
          border-radius: var(--radius-input);
          padding: 8px 14px;
          cursor: pointer;
        }
        .audit-log-pager button:disabled {
          opacity: 0.5;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
