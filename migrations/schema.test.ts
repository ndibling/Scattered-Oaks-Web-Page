import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';

const dir = path.dirname(fileURLToPath(import.meta.url));

// Applies every NNNN_*.sql migration in this directory, in filename order —
// mirrors how `wrangler d1 migrations apply` replays them, so this test file
// doesn't need editing every time a new migration is added (M5 added 0002).
const migrationFiles = readdirSync(dir)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();
const seedSql = readFileSync(path.join(dir, '..', 'seeds', 'sample-data.sql'), 'utf-8');

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  for (const file of migrationFiles) {
    db.exec(readFileSync(path.join(dir, file), 'utf-8'));
  }
  return db;
}

function countAll(db: DatabaseSync) {
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;
  return {
    animals: count('animals'),
    animal_media: count('animal_media'),
    gallery_photos: count('gallery_photos'),
    site_settings: count('site_settings'),
    site_content: count('site_content'),
  };
}

describe('D1 schema (all migrations applied)', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = freshDb();
  });

  it('creates all expected tables', () => {
    const rows = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'admins',
      'animal_media',
      'animals',
      'audit_log',
      'gallery_photos',
      'password_reset_tokens',
      'sessions',
      'site_content',
      'site_settings',
    ]);
  });

  it('rejects an invalid animals.status value (CHECK constraint)', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO animals (id, name, type, sex, status, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run('bad', 'Bad', 'Cow', 'Cow', 'sold-yesterday', 0),
    ).toThrow();
  });

  it('rejects an invalid animal_media.media_type value (CHECK constraint)', () => {
    db.prepare(
      `INSERT INTO animals (id, name, type, sex, status, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('daisy', 'Daisy', 'Cow', 'Cow', 'for-sale', 0);
    expect(() =>
      db
        .prepare(
          `INSERT INTO animal_media (id, animal_id, media_type, url, display_order) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('daisy-1', 'daisy', 'gif', '/x.gif', 0),
    ).toThrow();
  });

  it('rejects an invalid admins.role value (CHECK constraint)', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO admins (id, username, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('a1', 'someone', 'hash', 'salt', 'superadmin'),
    ).toThrow();
  });

  it('defaults deleted_at to NULL so animals are not soft-deleted by default', () => {
    db.prepare(
      `INSERT INTO animals (id, name, type, sex, status, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('daisy', 'Daisy', 'Cow', 'Cow', 'for-sale', 0);
    const row = db.prepare('SELECT deleted_at FROM animals WHERE id = ?').get('daisy') as {
      deleted_at: unknown;
    };
    expect(row.deleted_at).toBeNull();
  });
});

describe('0002_add_admin_email.sql', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = freshDb();
  });

  it('accepts an admin row with an email value', () => {
    db.prepare(
      `INSERT INTO admins (id, username, password_hash, password_salt, role, email) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('a1', 'root', 'hash', 'salt', 'root', 'root@scatteredoaksfarms.com');
    const row = db.prepare('SELECT email FROM admins WHERE id = ?').get('a1') as {
      email: string;
    };
    expect(row.email).toBe('root@scatteredoaksfarms.com');
  });

  it('rejects a second admin reusing the same email (UNIQUE constraint)', () => {
    db.prepare(
      `INSERT INTO admins (id, username, password_hash, password_salt, role, email) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('a1', 'root', 'hash', 'salt', 'root', 'root@scatteredoaksfarms.com');
    expect(() =>
      db
        .prepare(
          `INSERT INTO admins (id, username, password_hash, password_salt, role, email) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run('a2', 'someoneelse', 'hash', 'salt', 'admin', 'root@scatteredoaksfarms.com'),
    ).toThrow();
  });
});

describe('sample-data.sql seed', () => {
  it('loads the expected 11 animals, 14 media rows, 9 gallery photos, 2 settings, 40 content rows', () => {
    const db = freshDb();
    db.exec(seedSql);
    expect(countAll(db)).toEqual({
      animals: 11,
      animal_media: 14,
      gallery_photos: 9,
      site_settings: 2,
      site_content: 40,
    });
  });

  it('is idempotent — re-running it does not duplicate rows or throw', () => {
    const db = freshDb();
    db.exec(seedSql);
    const first = countAll(db);
    expect(() => db.exec(seedSql)).not.toThrow();
    const second = countAll(db);
    expect(second).toEqual(first);
  });
});
