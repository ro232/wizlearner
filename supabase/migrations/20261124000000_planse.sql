-- Planșe pentru clasă (/planse): un fel nou de proiect, „printable” (planșe cu alfabetul, cartonașe,
-- jetoane, diplome, orarul). Se salvează doar setările; numele copiilor de pe diplome nu ajung niciodată aici.
-- Rulează după 20261102000000_dashboard.sql. Poate fi rulat de mai multe ori.

ALTER TABLE saved_worksheets DROP CONSTRAINT IF EXISTS saved_worksheets_kind_check;
ALTER TABLE saved_worksheets ADD CONSTRAINT saved_worksheets_kind_check CHECK (kind IN ('sheet', 'workbook', 'book', 'name-book', 'group', 'printable'));

ALTER TABLE download_history DROP CONSTRAINT IF EXISTS download_history_kind_check;
ALTER TABLE download_history ADD CONSTRAINT download_history_kind_check CHECK (kind IN ('sheet', 'workbook', 'book', 'name-book', 'group', 'printable'));
