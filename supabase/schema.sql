-- ============================================================
-- supabase/schema.sql – Tkalnia Technotex V3
-- Normalized schema (replaces single JSON blob from V1)
--
-- Run in Supabase SQL editor to set up the database.
-- See README.md for full setup instructions.
-- ============================================================

-- ---- Extensions ----
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- ---- Artykuły (Products) ----
CREATE TABLE IF NOT EXISTS artykuly (
  id                  SERIAL PRIMARY KEY,
  nazwa               TEXT        NOT NULL,
  watki_na_cm         NUMERIC     NOT NULL DEFAULT 18,
  rozpinka            TEXT        NOT NULL DEFAULT 'nie' CHECK (rozpinka IN ('tak', 'nie')),
  rodzaj_snucia       TEXT        NOT NULL DEFAULT 'taśmowe'
                        CHECK (rodzaj_snucia IN ('taśmowe', 'zespołowe')),
  szerokosc_tkaniny   NUMERIC,
  uwagi               TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Typy krosien (Loom types) ----
CREATE TABLE IF NOT EXISTS typy_krosien (
  id      SERIAL PRIMARY KEY,
  nazwa   TEXT NOT NULL,
  kolor   TEXT NOT NULL DEFAULT '#2980b9'
);

-- ---- Rzedy krosien (Configurable loom rows) ----
CREATE TABLE IF NOT EXISTS rzedy_krosien (
  id       SERIAL PRIMARY KEY,
  nazwa    TEXT    NOT NULL DEFAULT '',
  pozycja  INTEGER NOT NULL DEFAULT 0
);

-- ---- Krosna (Looms) ----
CREATE TABLE IF NOT EXISTS krosna (
  id              SERIAL PRIMARY KEY,
  numer           TEXT    NOT NULL,
  typ_id          INTEGER REFERENCES typy_krosien(id) ON DELETE SET NULL,
  rodzaj          TEXT    NOT NULL DEFAULT 'pneumatyk'
                    CHECK (rodzaj IN ('pneumatyk', 'rapier')),
  szerokosc_cm    NUMERIC NOT NULL DEFAULT 170,
  status          TEXT    NOT NULL DEFAULT 'brak'
                    CHECK (status IN ('pracuje', 'awaria', 'zatrzymane', 'wiazanie', 'brak')),
  osnow_id        INTEGER, -- FK added after osnowy table
  art_id_override INTEGER REFERENCES artykuly(id) ON DELETE SET NULL,
  rzad_id         INTEGER REFERENCES rzedy_krosien(id) ON DELETE SET NULL,
  pozycja         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Osnowy (Warps) ----
CREATE TABLE IF NOT EXISTS osnowy (
  id               SERIAL PRIMARY KEY,
  numer            TEXT    NOT NULL,
  art_id           INTEGER NOT NULL REFERENCES artykuly(id) ON DELETE RESTRICT,
  metry            NUMERIC,
  liczba_osn       INTEGER,
  status_przew     TEXT    NOT NULL DEFAULT 'nieprzewleczona'
                     CHECK (status_przew IN ('przewleczona', 'nieprzewleczona')),
  lokalizacja      TEXT    NOT NULL DEFAULT 'magazyn'
                     CHECK (lokalizacja IN ('magazyn', 'przewlekalnia', 'krosno', 'snowalnia', 'klejarnia')),
  krosno_id        INTEGER REFERENCES krosna(id) ON DELETE SET NULL,
  status_przerobki TEXT    CHECK (status_przerobki IN ('w_kolejce', 'w_przygotowaniu', 'przewleczona')),
  zlecenie_id      INTEGER, -- FK added after zlecenia table
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from krosna to osnowy
ALTER TABLE krosna
  ADD CONSTRAINT fk_krosna_osnow
  FOREIGN KEY (osnow_id) REFERENCES osnowy(id) ON DELETE SET NULL;

-- ---- Zlecenia produkcyjne (Production orders) ----
CREATE TABLE IF NOT EXISTS zlecenia (
  id                SERIAL PRIMARY KEY,
  numer             TEXT    NOT NULL,
  art_id            INTEGER NOT NULL REFERENCES artykuly(id) ON DELETE RESTRICT,
  ilosc_m           NUMERIC NOT NULL,
  wykonane_m        NUMERIC NOT NULL DEFAULT 0,
  pozostalo_m       NUMERIC NOT NULL DEFAULT 0,
  status            TEXT    NOT NULL DEFAULT 'nowe'
                      CHECK (status IN ('nowe', 'w_trakcie', 'zrealizowane')),
  data_utworzenia   DATE    NOT NULL DEFAULT CURRENT_DATE,
  termin_realizacji DATE    NOT NULL,
  priorytet         TEXT    NOT NULL DEFAULT 'standard'
                      CHECK (priorytet IN ('niski', 'standard', 'wysoki', 'krytyczny')),
  uwagi             TEXT    NOT NULL DEFAULT '',
  przekazane_do     TEXT    CHECK (przekazane_do IN ('snowalnia', 'klejarnia')),
  split_lengths     INTEGER[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE osnowy
  ADD COLUMN IF NOT EXISTS liczba_osn INTEGER;

ALTER TABLE zlecenia
  ADD COLUMN IF NOT EXISTS wykonane_m NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE zlecenia
  ADD COLUMN IF NOT EXISTS pozostalo_m NUMERIC NOT NULL DEFAULT 0;

UPDATE zlecenia
SET
  wykonane_m = GREATEST(COALESCE(wykonane_m, 0), 0),
  pozostalo_m = GREATEST(ilosc_m - GREATEST(COALESCE(wykonane_m, 0), 0), 0)
WHERE
  wykonane_m IS NULL
  OR pozostalo_m IS NULL
  OR pozostalo_m <> GREATEST(ilosc_m - GREATEST(COALESCE(wykonane_m, 0), 0), 0);

-- Add FK from osnowy to zlecenia
ALTER TABLE osnowy
  ADD CONSTRAINT fk_osnowy_zlecenie
  FOREIGN KEY (zlecenie_id) REFERENCES zlecenia(id) ON DELETE SET NULL;

-- ---- Pracownicy (Employees) ----
CREATE TABLE IF NOT EXISTS pracownicy (
  id          SERIAL PRIMARY KEY,
  imie        TEXT     NOT NULL,
  nazwisko    TEXT     NOT NULL,
  stanowisko  TEXT     NOT NULL
                CHECK (stanowisko IN ('tkalnia', 'snowalnia', 'klejarnia', 'przewlekalnia')),
  zmiana      SMALLINT NOT NULL DEFAULT 1 CHECK (zmiana IN (1, 2)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Nieobecności (Planned absences) ----
CREATE TABLE IF NOT EXISTS nieobecnosci (
  id            SERIAL PRIMARY KEY,
  pracownik_id  INTEGER NOT NULL REFERENCES pracownicy(id) ON DELETE CASCADE,
  typ           TEXT    NOT NULL CHECK (typ IN ('urlop', 'chory', 'inne')),
  data_od DATE NOT NULL,
  data_do DATE NOT NULL,
  uwagi         TEXT    NOT NULL DEFAULT '',
  CONSTRAINT valid_range CHECK (data_od <= data_do),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Obecności (Attendance records) ----
CREATE TABLE IF NOT EXISTS obecnosci (
  id            SERIAL PRIMARY KEY,
  pracownik_id  INTEGER  NOT NULL REFERENCES pracownicy(id) ON DELETE CASCADE,
  data          DATE     NOT NULL,
  zmiana        SMALLINT NOT NULL CHECK (zmiana IN (1, 2)),
  status        TEXT     NOT NULL
                  CHECK (status IN ('obecny', 'nieobecny', 'chory', 'urlop')),
  stanowisko    TEXT     NOT NULL
                  CHECK (stanowisko IN ('tkalnia', 'snowalnia', 'klejarnia', 'przewlekalnia')),
  UNIQUE (pracownik_id, data, zmiana),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Snowalnia (Carding department batches) ----
CREATE TABLE IF NOT EXISTS snowalnia (
  id              SERIAL PRIMARY KEY,
  numer           TEXT    NOT NULL,
  art_id          INTEGER NOT NULL REFERENCES artykuly(id) ON DELETE RESTRICT,
  metry           NUMERIC NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'w_kolejce'
                    CHECK (status IN ('w_kolejce', 'w_trakcie', 'gotowe', 'zarchiwizowane')),
  data_planowana  DATE    NOT NULL,
  uwagi           TEXT    NOT NULL DEFAULT '',
  zlecenie_id     INTEGER REFERENCES zlecenia(id) ON DELETE SET NULL,
  split_lengths   INTEGER[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Klejarnia (Gluing department batches) ----
CREATE TABLE IF NOT EXISTS klejarnia (
  id              SERIAL PRIMARY KEY,
  numer           TEXT    NOT NULL,
  art_id          INTEGER NOT NULL REFERENCES artykuly(id) ON DELETE RESTRICT,
  metry           NUMERIC NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'w_kolejce'
                    CHECK (status IN ('w_kolejce', 'w_trakcie', 'gotowe', 'zarchiwizowane')),
  data_planowana  DATE    NOT NULL,
  uwagi           TEXT    NOT NULL DEFAULT '',
  zlecenie_id     INTEGER REFERENCES zlecenia(id) ON DELETE SET NULL,
  split_lengths   INTEGER[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Historia (Change history / audit log) ----
CREATE TABLE IF NOT EXISTS historia (
  id          SERIAL PRIMARY KEY,
  encja       TEXT    NOT NULL,   -- e.g. 'krosno', 'osnowa', 'zlecenie'
  encja_id    INTEGER NOT NULL,
  typ         TEXT    NOT NULL,   -- e.g. 'zalozenie_osnowy', 'zmiana_statusu'
  opis        TEXT    NOT NULL,
  uzytkownik  TEXT    NOT NULL DEFAULT 'Operator',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Zadania (Tasks) ----
CREATE TABLE IF NOT EXISTS zadania (
  id        SERIAL PRIMARY KEY,
  tekst     TEXT    NOT NULL,
  priorytet TEXT    NOT NULL DEFAULT 'sredni'
              CHECK (priorytet IN ('niski', 'sredni', 'wysoki')),
  zrobione  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE artykuly      ENABLE ROW LEVEL SECURITY;
ALTER TABLE typy_krosien  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rzedy_krosien ENABLE ROW LEVEL SECURITY;
ALTER TABLE krosna        ENABLE ROW LEVEL SECURITY;
ALTER TABLE osnowy        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zlecenia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pracownicy    ENABLE ROW LEVEL SECURITY;
ALTER TABLE nieobecnosci  ENABLE ROW LEVEL SECURITY;
ALTER TABLE obecnosci     ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowalnia     ENABLE ROW LEVEL SECURITY;
ALTER TABLE klejarnia     ENABLE ROW LEVEL SECURITY;
ALTER TABLE historia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zadania       ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users (single shared team login)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'artykuly','typy_krosien','rzedy_krosien','krosna','osnowy','zlecenia',
    'pracownicy','nieobecnosci','obecnosci','snowalnia','klejarnia','historia','zadania'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl, tbl
    );
    -- Allow anon read so the app works without forced login in dev
    EXECUTE format(
      'CREATE POLICY "anon_read_%s" ON %I FOR SELECT TO anon USING (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- TRIGGERS – auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_zlecenie_metry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.wykonane_m := GREATEST(COALESCE(NEW.wykonane_m, 0), 0);
  NEW.pozostalo_m := GREATEST(COALESCE(NEW.ilosc_m, 0) - NEW.wykonane_m, 0);
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'artykuly','krosna','osnowy','zlecenia','pracownicy','obecnosci',
    'snowalnia','klejarnia','zadania'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_zlecenia_sync_metry ON zlecenia;
CREATE TRIGGER trg_zlecenia_sync_metry
BEFORE INSERT OR UPDATE ON zlecenia
FOR EACH ROW
EXECUTE FUNCTION sync_zlecenie_metry();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_krosna_rzad    ON krosna(rzad_id);
CREATE INDEX IF NOT EXISTS idx_krosna_osnow   ON krosna(osnow_id);
CREATE INDEX IF NOT EXISTS idx_osnowy_art     ON osnowy(art_id);
CREATE INDEX IF NOT EXISTS idx_osnowy_krosno  ON osnowy(krosno_id);
CREATE INDEX IF NOT EXISTS idx_osnowy_lok     ON osnowy(lokalizacja);
CREATE INDEX IF NOT EXISTS idx_zlecenia_art   ON zlecenia(art_id);
CREATE INDEX IF NOT EXISTS idx_obecnosci_data ON obecnosci(data);
CREATE INDEX IF NOT EXISTS idx_obecnosci_prac ON obecnosci(pracownik_id);
CREATE INDEX IF NOT EXISTS idx_nieob_prac     ON nieobecnosci(pracownik_id);
CREATE INDEX IF NOT EXISTS idx_historia_encja ON historia(encja, encja_id);
CREATE INDEX IF NOT EXISTS idx_historia_date  ON historia(created_at DESC);
