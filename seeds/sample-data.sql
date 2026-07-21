-- Local/preview sample data (Development-Plan.md M2), sourced from the 11
-- animals + 9 gallery photos in design-reference/Scattered Oaks Farms.dc.html.
--
-- Idempotent: uses INSERT OR REPLACE with deterministic IDs, safe to re-run
-- (e.g. resetting local dev data, or reseeding the preview D1 on every PR
-- build per SDD.md §2.2) without duplicating or erroring.
--
-- Image/video URLs point at design-reference/uploads/ paths as placeholders —
-- the actual files haven't been pulled into R2 yet (M4/M10 does that); update
-- these once real R2-backed URLs exist.

-- registered_name, imza_number, expected_height, sire_registered_name,
-- dam_registered_name are left NULL: the source sample data never populated
-- them either (the design prototype's modal falls back to "Ask Heather").

INSERT OR REPLACE INTO animals (id, name, type, sex, age_text, status, price_cents, description, display_order) VALUES
  ('daisy',     'Daisy',     'Cow',  'Cow',        '1 yr',    'for-sale',     210000, 'Young cow, friendly and food-motivated.', 10),
  ('molly',     'Molly',     'Cow',  'Cow',        '2 yrs',   'for-sale',     250000, 'Gentle, easy keeper who does great in a mixed herd.', 20),
  ('uma',       'Uma',       'Cow',  'Cow',        'Adult',   'pending',      260000, 'Reserved -- sale in progress with a lovely family.', 30),
  ('irish',     'Irish',     'Calf', 'Bull Calf',  '2 mo',    'coming-soon',  220000, 'A frisky, sweet-faced calf still on mama. Ready to go soon.', 40),
  ('coco',      'Coco',      'Calf', 'Heifer Calf','2 mo',    'coming-soon',  220000, 'Curious and cuddly, growing fast on pasture.', 50),
  ('samson',    'Samson',    'Calf', 'Bull Calf',  '2 mo',    'coming-soon',  230000, 'A sturdy little calf with a big personality.', 60),
  ('bug',       'Bug',       'Bull', 'Bull',       'Adult',   'not-for-sale', NULL,   'A striking herd bull, always on the move.', 70),
  ('lucky',     'Lucky',     'Bull', 'Bull',       'Adult',   'not-for-sale', NULL,   'Easygoing bull who loves visitors at the fence line.', 80),
  ('lightning', 'Lightning', 'Bull', 'Bull',       'Adult',   'not-for-sale', NULL,   'A striking speckled bull with a calm, steady nature.', 90),
  ('baron',     'Baron',     'Calf', 'Bull Calf',  'Newborn', 'coming-soon',  220000, 'A speckled newborn just settling in -- ready to go soon.', 100),
  ('peanut',    'Peanut',    'Cow',  'Cow',        'Adult',   'for-sale',     240000, 'A gentle, easygoing cow who gets along great with the herd.', 110);

INSERT OR REPLACE INTO animal_media (id, animal_id, media_type, url, display_order) VALUES
  ('daisy-1',     'daisy',     'image', '/uploads/Daisy.jpg', 0),
  ('molly-1',     'molly',     'image', '/uploads/Molly.jpg', 0),
  ('uma-1',       'uma',       'image', '/uploads/Uma.jpg', 0),
  ('irish-1',     'irish',     'image', '/uploads/Irish.jpg', 0),
  ('coco-1',      'coco',      'image', '/uploads/Coco.jpg', 0),
  ('coco-2',      'coco',      'image', '/uploads/Coco 2.jpg', 1),
  ('samson-1',    'samson',    'image', '/uploads/Samson.jpg', 0),
  ('samson-2',    'samson',    'image', '/uploads/Samson 2.jpg', 1),
  ('samson-3',    'samson',    'video', '/uploads/2e0516ef-cbb9-415e-b1b2-59d30546a071.mp4', 2),
  ('bug-1',       'bug',       'image', '/uploads/Bug.jpg', 0),
  ('lucky-1',     'lucky',     'image', '/uploads/Lucky.jpg', 0),
  ('lightning-1', 'lightning', 'image', '/uploads/Lightning.jpg', 0),
  ('baron-1',     'baron',     'image', '/uploads/Baron.jpg', 0),
  ('peanut-1',    'peanut',    'image', '/uploads/Peanut.jpg', 0);

INSERT OR REPLACE INTO gallery_photos (id, url, label, description, display_order) VALUES
  ('mamma-needing-help',      '/uploads/Mamma Needing Help.jpg',      'Mamma Needing Help',      'A late-night calving check under the heat lamp.', 10),
  ('really-another-picture',  '/uploads/Really Another Picture.jpg',  'Really Another Picture',  'Another day in the barn with the herd.', 20),
  ('rescue-mission',          '/uploads/Rescue Mission.jpg',          'Rescue Mission',          'A curious calf getting a helping hand.', 30),
  ('scattered-oaks-farm-2',   '/uploads/Scattered Oaks Farm 2.jpg',   'Scattered Oaks Farm 2',   'Evenings around the barn at Scattered Oaks.', 40),
  ('where-we-going',          '/uploads/Where we going.jpg',          'Where We Going',          'Loading up for a trip off the farm.', 50),
  ('cool-summer-drink',       '/uploads/Cool Summer Drink.jpg',       'Cool Summer Drink',       'The herd cooling off at the water trough.', 60),
  ('evilyn-and-calf',         '/uploads/Evilyn and calf.jpg',         'Evilyn and Calf',         'One of our girls looking after a newborn.', 70),
  ('happy-easter',            '/uploads/Happy Easter.jpg',            'Happy Easter',            'Celebrating the holiday with the herd.', 80),
  ('jeeping-on-the-farm',     '/uploads/Jeeping on the Farm.jpg',     'Jeeping on the Farm',     'The herd checking out the farm truck.', 90);

INSERT OR REPLACE INTO site_settings (key, value) VALUES
  ('showPublicPrices', 'true'),
  ('galleryStyle', 'grid');
