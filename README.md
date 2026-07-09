# Tkalnia Technotex – V2

Aplikacja planowania produkcji dla tkalni. Zbudowana w **Next.js 14 + React 18 + TypeScript** z backendem na **Supabase** i deploymentem na **Vercel**.

---

## Moduły

| Moduł | Opis |
|---|---|
| **Tkalnia** | Mapa hali z konfigurowalnymi rzędami krosien, statusy, panel szczegółów |
| **Artykuły** | Słownik artykułów tkanin |
| **Zlecenia** | Zlecenia produkcyjne z priorytetem i przekazaniem do oddziału |
| **Snowalnia** | Partie snowania – kolejka, status, zakończenie |
| **Klejarnia** | Partie klejenia – kolejka, status, zakończenie |
| **Magazyn osnów** | Stan osnów w magazynie, lokalizacje |
| **Przewlekalnia** | Przyjęcie osnów i przekazanie na krosna |
| **Obecności** | Dzienne statusy pracowników + kalendarz urlopów / chorobowych |
| **Zadania** | Prosty notatnik z priorytetami |
| **Historia** | Dziennik kluczowych operacji |
| **Ustawienia** | Typy krosien i układ rzędów tkalni |

---

## Wymagania

- Node.js 18+
- Konto Supabase (darmowy plan wystarczy)
- Konto Vercel (darmowy plan wystarczy)

---

## Lokalne uruchomienie

### 1. Sklonuj repo

```bash
git clone https://github.com/Kuba2406/Tkalnia-Technotex.git
cd Tkalnia-Technotex
npm install
```

### 2. Skonfiguruj Supabase

1. Utwórz nowy projekt na [supabase.com](https://supabase.com).
2. Przejdź do **SQL Editor** i wklej zawartość pliku [`supabase/schema.sql`](supabase/schema.sql).  
   Wykona to migrację – stworzy wszystkie tabele, indeksy, polityki RLS i triggery.
3. Opcjonalnie wklej [`supabase/seed.sql`](supabase/seed.sql), żeby załadować dane demonstracyjne.

### 3. Ustaw zmienne środowiskowe

Skopiuj plik `.env.example` do `.env.local`:

```bash
cp .env.example .env.local
```

Uzupełnij wartości z panelu projektu Supabase (**Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Uwaga:** `SUPABASE_SERVICE_ROLE_KEY` jest używany wyłącznie po stronie serwera (API routes) do operacji zapisu. Nigdy nie trafi do przeglądarki – jest tylko w `SUPABASE_SERVICE_ROLE_KEY` (bez prefiksu `NEXT_PUBLIC_`).

### 4. Uruchom lokalnie

```bash
npm run dev
```

Aplikacja dostępna pod: [http://localhost:3000](http://localhost:3000)

---

## Wdrożenie na Vercel

### Metoda A – przez GitHub (zalecana)

1. Wypchnij kod do repozytorium na GitHub.
2. Zaloguj się na [vercel.com](https://vercel.com) i wybierz **Add New Project**.
3. Wskaż to repozytorium.
4. W sekcji **Environment Variables** dodaj te same 3 zmienne co w `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Kliknij **Deploy**.

Vercel automatycznie wykryje Next.js i skonfiguruje build.

### Metoda B – Vercel CLI

```bash
npm i -g vercel
vercel
```

Postępuj zgodnie z instrukcjami CLI. Zmienne środowiskowe ustaw przez `vercel env add`.

---

## Struktura projektu

```
src/
├── app/
│   ├── api/               # API routes (każda encja osobno)
│   │   ├── artykuly/
│   │   ├── krosna/
│   │   ├── osnowy/
│   │   ├── historia/
│   │   └── ...
│   ├── artykuly/page.tsx
│   ├── tkalnia/page.tsx
│   ├── obecnosci/page.tsx
│   └── ...               # pozostałe strony
├── components/
│   ├── artykuly/
│   ├── tkalnia/          # TkalniaView + LoomDetail
│   ├── obecnosci/        # ObecnosciView + ObecnoscKalendarz
│   ├── zadania/
│   ├── historia/
│   ├── ustawienia/
│   ├── layout/           # AppShell – sidebar + nawigacja
│   └── ui/               # Modal, Confirm, SaveStatus, DepartmentBatchView
├── lib/
│   ├── supabase/         # client.ts (browser), server.ts (server-side)
│   └── utils/            # formatting.ts, api.ts
└── types/
    └── domain.ts         # wszystkie typy domenowe
supabase/
├── schema.sql            # migracja – uruchom w Supabase SQL Editor
└── seed.sql              # dane demonstracyjne (opcjonalne)
```

---

## Kluczowe decyzje architektoniczne (V2 vs V1)

| | V1 | V2 |
|---|---|---|
| Architektura UI | Vanilla JS SPA (`public/app.js` 115KB) | Next.js App Router + React components |
| Stan | Jeden gigantyczny `AppState` | SWR per widok, lokalny `useState` |
| Persystencja | Pełny JSON blob przy każdej zmianie | Normalny model relacyjny, PATCH po encji |
| Baza danych | Jedna tabela `app_state(payload jsonb)` | 13 tabel z FK, RLS, triggerami |
| Synchronizacja | `scheduleApiSave()` timeout 3s, brak kolejki | SWR mutate po każdej operacji |
| Bug obecności | DOM manipulation, przyciski gasną | Kontrolowany React state `attState` |
| Układ tkalni | Sztywny | Konfigurowalne rzędy (`rzedy_krosien`) |
| Dowiązanie osnów | Brak reguły | Reguła: nieprzewleczona może być założona, jeśli ten artykuł jest już na innym krośnie |

---

## Zmienne środowiskowe – pełna lista

| Zmienna | Wymagana | Opis |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Klucz publiczny (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Klucz serwisowy (tylko backend) |

---

## Rozwiązywanie problemów

### Błąd `relation "artykuly" does not exist`
Migracja nie została uruchomiona. Uruchom `supabase/schema.sql` w SQL Editor Supabase.

### Błąd 401 / `JWT expired`
Sprawdź poprawność kluczy w zmiennych środowiskowych.

### Strona ładuje się, ale dane są puste
1. Sprawdź czy migracja (`schema.sql`) została uruchomiona.
2. Opcjonalnie załaduj dane testowe (`seed.sql`).
3. Sprawdź polityki RLS w Supabase – dla środowiska developerskiego można tymczasowo wyłączyć RLS na tabelach.

---

## Licencja

Projekt prywatny – Tkalnia Technotex.

