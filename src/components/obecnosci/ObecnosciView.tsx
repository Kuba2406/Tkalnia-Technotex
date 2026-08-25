'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { Pracownik, Obecnosc, Nieobecnosc } from '@/types/domain';
import ObecnoscKalendarz from './ObecnoscKalendarz';
import TabPracownicy from './TabPracownicy';
import TabPlanZmian from './TabPlanZmian';
import TabObecnosc from './TabObecnosc';
import TabNieobecnosci from './TabNieobecnosci';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);

type Tab = 'pracownicy' | 'zmiany' | 'obecnosc' | 'nieobecnosci' | 'kalendarz';

export default function ObecnosciView() {
  const [tab, setTab] = useState<Tab>('pracownicy');
  const { data: pracownicy = [] } = useSWR<Pracownik[]>('/api/pracownicy', fetcher);
  const { data: obecnosci = [] } = useSWR<Obecnosc[]>('/api/obecnosci', fetcher);
  const { data: nieobecnosci = [] } = useSWR<Nieobecnosc[]>('/api/nieobecnosci', fetcher);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'pracownicy',   label: 'Pracownicy' },
    { id: 'zmiany',       label: 'Plan zmian' },
    { id: 'obecnosc',     label: 'Obecność dzienna' },
    { id: 'nieobecnosci', label: 'Nieobecności' },
    { id: 'kalendarz',    label: 'Kalendarz' },
  ];

  return (
    <div>
      <div className="view-header">
        <h2>Obecności</h2>
        <p>Pracownicy, zmiany i codzienne sprawdzanie obecności</p>
      </div>
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'pracownicy'   && <TabPracownicy pracownicy={pracownicy} nieobecnosci={nieobecnosci} obecnosci={obecnosci} />}
      {tab === 'zmiany'       && <TabPlanZmian pracownicy={pracownicy} />}
      {tab === 'obecnosc'     && <TabObecnosc pracownicy={pracownicy} obecnosci={obecnosci} nieobecnosci={nieobecnosci} />}
      {tab === 'nieobecnosci' && <TabNieobecnosci pracownicy={pracownicy} nieobecnosci={nieobecnosci} />}
      {tab === 'kalendarz'    && <ObecnoscKalendarz pracownicy={pracownicy} nieobecnosci={nieobecnosci} />}
    </div>
  );
}
