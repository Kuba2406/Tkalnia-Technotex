-- ============================================================
-- supabase/seed.sql – Seed data for Tkalnia Technotex V3
-- Run AFTER schema.sql
-- ============================================================

-- ---- Artykuły ----
INSERT INTO artykuly (nazwa, watki_na_cm, rozpinka, rodzaj_snucia, szerokosc_tkaniny, uwagi) VALUES
  ('BT 367',  18, 'nie', 'taśmowe',   170, ''),
  ('BT 412',  20, 'tak', 'taśmowe',   180, 'Wymaga rozpinki'),
  ('ZE 100',  15, 'nie', 'zespołowe',  160, 'Klejarnia'),
  ('BT 290',  16, 'nie', 'taśmowe',   140, ''),
  ('ZE 215',  22, 'tak', 'zespołowe',  200, 'Klejarnia – szeroka')
ON CONFLICT DO NOTHING;

-- ---- Typy krosien ----
INSERT INTO typy_krosien (nazwa, kolor) VALUES
  ('PICANOL GTM-A', '#2980b9'),
  ('PICANOL GTM-B', '#27ae60'),
  ('PICANOL OMNI',  '#d4a017'),
  ('SULZER',        '#8e44ad')
ON CONFLICT DO NOTHING;

-- ---- Rzędy krosien ----
INSERT INTO rzedy_krosien (nazwa, pozycja) VALUES
  ('Rząd A', 0),
  ('Rząd B', 1),
  ('Rząd C', 2)
ON CONFLICT DO NOTHING;

-- ---- Krosna ----
INSERT INTO krosna (numer, typ_id, rodzaj, szerokosc_cm, status, rzad_id, pozycja) VALUES
  ('K-01', 1, 'pneumatyk', 170, 'pracuje',    1, 0),
  ('K-02', 1, 'pneumatyk', 170, 'pracuje',    1, 1),
  ('K-03', 2, 'pneumatyk', 180, 'zatrzymane', 1, 2),
  ('K-04', 2, 'pneumatyk', 180, 'pracuje',    1, 3),
  ('K-05', 3, 'rapier',    200, 'pracuje',    2, 0),
  ('K-06', 3, 'rapier',    200, 'awaria',     2, 1),
  ('K-07', 4, 'rapier',    160, 'pracuje',    2, 2),
  ('K-08', 1, 'pneumatyk', 170, 'wiazanie',   3, 0),
  ('K-09', 2, 'pneumatyk', 180, 'pracuje',    3, 1),
  ('K-10', 3, 'rapier',    200, 'pracuje',    3, 2)
ON CONFLICT DO NOTHING;

-- ---- Pracownicy ----
INSERT INTO pracownicy (imie, nazwisko, stanowisko, zmiana) VALUES
  ('Jan',      'Kowalski',   'tkalnia',       1),
  ('Anna',     'Nowak',      'tkalnia',       1),
  ('Piotr',    'Wiśniewski', 'tkalnia',       2),
  ('Maria',    'Wójcik',     'tkalnia',       2),
  ('Tomasz',   'Kowalczyk',  'snowalnia',     1),
  ('Agnieszka','Kamińska',   'klejarnia',     1),
  ('Michał',   'Lewandowski','przewlekalnia', 2),
  ('Katarzyna','Zielińska',  'snowalnia',     2)
ON CONFLICT DO NOTHING;

-- ---- Zlecenia ----
INSERT INTO zlecenia (numer, art_id, ilosc_m, wykonane_m, pozostalo_m, status, data_utworzenia, termin_realizacji, priorytet, uwagi) VALUES
  ('ZP-001/2025', 1, 5000, 2000, 3000, 'w_trakcie',   CURRENT_DATE - 14, CURRENT_DATE + 30,  'wysoki',   'Pilne'),
  ('ZP-002/2025', 2, 3000,    0, 3000, 'nowe',         CURRENT_DATE - 7,  CURRENT_DATE + 45,  'standard', ''),
  ('ZP-003/2025', 3, 2500,    0, 2500, 'nowe',         CURRENT_DATE - 3,  CURRENT_DATE + 60,  'niski',    ''),
  ('ZP-004/2025', 4, 8000, 3500, 4500, 'w_trakcie',   CURRENT_DATE - 21, CURRENT_DATE + 14,  'krytyczny','Termin przesunięty'),
  ('ZP-005/2025', 5, 1500, 1500,    0, 'zrealizowane', CURRENT_DATE - 60, CURRENT_DATE - 10, 'standard', '')
ON CONFLICT DO NOTHING;

-- ---- Osnowy ----
INSERT INTO osnowy (numer, art_id, metry, liczba_osn, status_przew, lokalizacja, krosno_id, status_przerobki, zlecenie_id) VALUES
  ('O-001', 1, 1200, 24, 'nieprzewleczona', 'magazyn',      NULL, NULL, 1),
  ('O-002', 2,  800, 18, 'przewleczona',     'przewlekalnia', NULL, 'przewleczona', 2),
  ('O-003', 3,  950, 20, 'nieprzewleczona', 'krosno',        1,    'w_przygotowaniu', 3),
  ('O-004', 4, 1500, 30, 'przewleczona',     'krosno',        4,    'przewleczona', 4)
ON CONFLICT DO NOTHING;

-- ---- Krosna -> osnowy po seedzie ----
UPDATE krosna SET osnow_id = 3 WHERE id = 1;
UPDATE krosna SET osnow_id = 4 WHERE id = 4;

-- ---- Snowalnia ----
INSERT INTO snowalnia (numer, art_id, metry, status, data_planowana, uwagi, zlecenie_id) VALUES
  ('S-001', 1, 1200, 'w_kolejce', CURRENT_DATE + 7,  '', 1),
  ('S-002', 2,  800, 'w_trakcie', CURRENT_DATE + 3,  'Do pilnej realizacji', 2),
  ('S-003', 3,  950, 'gotowe',    CURRENT_DATE + 10, '', 3)
ON CONFLICT DO NOTHING;

-- ---- Klejarnia ----
INSERT INTO klejarnia (numer, art_id, metry, status, data_planowana, uwagi, zlecenie_id) VALUES
  ('KJ-001', 3, 900, 'w_kolejce', CURRENT_DATE + 5, '', 3),
  ('KJ-002', 5, 700, 'w_trakcie', CURRENT_DATE + 2, 'Pilne', 5),
  ('KJ-003', 4, 1200, 'gotowe',   CURRENT_DATE + 8, '', 4)
ON CONFLICT DO NOTHING;

-- ---- Zadania ----
INSERT INTO zadania (tekst, priorytet, zrobione) VALUES
  ('Sprawdzić stan krosna K-06 po awarii',         'wysoki', false),
  ('Zamówić cewki do snowalni na przyszły tydzień', 'sredni',  false),
  ('Aktualizacja planu produkcji na sierpień',     'sredni',  false),
  ('Kontakt z dostawcą przędzy BT 367',            'niski',   true)
ON CONFLICT DO NOTHING;
