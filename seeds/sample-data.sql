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
  ('uma',       'Uma',       'Cow',  'Cow',        'Adult',   'pending',      260000, 'Reserved — sale in progress with a lovely family.', 30),
  ('irish',     'Irish',     'Calf', 'Bull Calf',  '2 mo',    'coming-soon',  220000, 'A frisky, sweet-faced calf still on mama. Ready to go soon.', 40),
  ('coco',      'Coco',      'Calf', 'Heifer Calf','2 mo',    'coming-soon',  220000, 'Curious and cuddly, growing fast on pasture.', 50),
  ('samson',    'Samson',    'Calf', 'Bull Calf',  '2 mo',    'coming-soon',  230000, 'A sturdy little calf with a big personality.', 60),
  ('bug',       'Bug',       'Bull', 'Bull',       'Adult',   'not-for-sale', NULL,   'A striking herd bull, always on the move.', 70),
  ('lucky',     'Lucky',     'Bull', 'Bull',       'Adult',   'not-for-sale', NULL,   'Easygoing bull who loves visitors at the fence line.', 80),
  ('lightning', 'Lightning', 'Bull', 'Bull',       'Adult',   'not-for-sale', NULL,   'A striking speckled bull with a calm, steady nature.', 90),
  ('baron',     'Baron',     'Calf', 'Bull Calf',  'Newborn', 'coming-soon',  220000, 'A speckled newborn just settling in — ready to go soon.', 100),
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

-- Editable site text (Requirements.md §7.2.1: headline, About copy, stat
-- labels, form labels, etc.), sourced from design-reference's hardcoded copy.
INSERT OR REPLACE INTO site_content (key, value_text) VALUES
  ('site.farm_name', 'Scattered Oaks Farms'),
  ('site.dba_line', 'A DBA of Heather Johnston — hello@scatteredoaksfarms.com'),
  -- [ADDED] 2026-07-22 (M6) — Hero/About photos and the farm logo were
  -- hardcoded <img src> paths in Hero.tsx/Header.tsx/About.tsx with no
  -- backing data, despite Requirements §7.2.1 requiring they be
  -- admin-replaceable. Seeded here at their current hardcoded paths so
  -- swapping those components to read from content is a no-op until an
  -- admin actually replaces one via ContentEditor. See SDD.md §5 change log.
  ('site.logo_url', '/uploads/Scattered Oaks Logo-eb6f247a.png'),
  ('hero.photo_url', '/uploads/Scattered Oaks Farm 3.jpg'),
  ('about.photo_url', '/uploads/Scattered Oaks Farm.jpg'),
  ('nav.home', 'Home'),
  ('nav.about', 'About'),
  ('nav.animals', 'Available Animals'),
  ('nav.gallery', 'Gallery'),
  ('nav.contact', 'Contact'),
  ('hero.eyebrow', 'A Family Homestead — Est. by Heather Johnston'),
  ('hero.headline', 'Small Farm, Big Personalities.'),
  ('hero.intro', 'We raise laid-back miniature zebu under swaying palms — friendly, sturdy little cattle with mile-long horns and even longer naps. Come meet the herd.'),
  ('hero.cta_primary', 'See Who''s Available'),
  ('hero.cta_secondary', 'Our Story'),
  ('hero.badge', '38 head strong'),
  ('about.eyebrow', 'About the Farm'),
  ('about.heading', 'Scattered Oaks Farms'),
  ('about.paragraph_1', 'Scattered Oaks Farms is a DBA of Heather Johnston, run out of a sun-warmed patch of Bradenton, Florida pasture where the oaks are wide, the palms lean sideways, and the cattle are miniature. What started as two zebu and a dream has grown into a herd of 38 — 35 cows and 3 bulls — each one unique, with their own personality, and more than a little spoiled.'),
  ('about.paragraph_2', 'We fell for miniature zebu because they''re gentle enough for a front porch and hardy enough for the heat. Every animal here is raised on pasture, handled daily, and treated like family — which is exactly how we hope they''ll be treated wherever they land next.'),
  ('about.stat_1_value', '35'),
  ('about.stat_1_label', 'Cows & Calves'),
  ('about.stat_2_value', '3'),
  ('about.stat_2_label', 'Herd Bulls'),
  ('about.stat_3_value', '100%'),
  ('about.stat_3_label', 'Pasture Raised'),
  ('animals.eyebrow', 'The Herd'),
  ('animals.heading', 'Available Miniature Zebu'),
  ('animals.subheading', 'A featured look at our 38-head herd — from ready-to-go to reserved for keeps.'),
  ('gallery.eyebrow', 'Follow Along'),
  ('gallery.heading', 'Life on the Farm'),
  ('gallery.facebook_label', 'Scattered Oaks Farm Miniature Zebu'),
  ('gallery.facebook_url', 'https://www.facebook.com/profile.php?id=61580526135257'),
  ('contact.eyebrow', 'Get In Touch'),
  ('contact.heading', 'Say Howdy to Heather'),
  ('contact.subheading', 'Questions about an animal, pricing, or just want to talk zebu? Drop a line below.'),
  ('contact.label_name', 'Name'),
  ('contact.label_email', 'Email'),
  ('contact.label_interested_in', 'Interested In'),
  ('contact.label_message', 'Message'),
  ('contact.label_submit', 'Send Message'),
  ('contact.thankyou_heading', 'Thanks, partner!'),
  ('contact.thankyou_body', 'Heather will get back to you soon.');

-- Dev-only Root admin fixture (Development-Plan.md M5), for local/preview
-- `/admin/login` testing and as the auth integration tests' known-good
-- account. Never used in production — the real Root account is bootstrapped
-- separately at deploy time via a one-time GitHub secret, per
-- Manual-Setup-Guide.md Phase H1/I1. Password/salt below are the PBKDF2-
-- SHA256 hash (workers/lib/password.ts) of the plaintext dev password
-- `DevRoot!2026`, documented in Development-Plan.md's M5 notes since it's
-- fixture data, not a real credential.
INSERT OR REPLACE INTO admins (id, username, email, password_hash, password_salt, role) VALUES
  ('root-dev', 'Root', 'dev-root@example.com', '57fb31b9e05fc8d88ca301da3b61ff7c0a2030932e31bc01424be7a30311ca41', '10644714fc9b8ebd4381ea66d6914456', 'root');
