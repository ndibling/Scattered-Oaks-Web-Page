// Bindings from wrangler.toml — kept in one place so every route module and
// test file references the same shape.
export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
};
