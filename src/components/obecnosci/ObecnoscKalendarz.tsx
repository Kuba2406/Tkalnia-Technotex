'use client';

import { useState } from 'react';
import type { Pracownik, Nieobecnosc } from '@/types/domain';
import { daysOfMonth, dayOfWeek, DAYS_PL_SHORT } from '@/lib/utils/formatting';

interface Props {
  pracownicy: Pracownik[];
  nieobecnosci: Nieobecnosc[];
}

export default function ObecnoscKalendarz({ pracownicy, nieobecnosci }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const todayStr = now.toISOString().split('T')[0];

  const days = daysOfMonth(year, month);
  const firstDow = dayOfWeek(days[0]); // 0=Mon

  // Build a map: date -> list of absences
  const absMap = new Map<string, Nieobecnosc[]>();
  nieobecnosci.forEach(n => {
    // Expand range into individual days
    const od = new Date(n.od);
    const doD = new Date(n.do);
    const cur = new Date(od);
    while (cur <= doD) {
      const key = cur.toISOString().split('T')[0];
      if (!absMap.has(key)) absMap.set(key, []);
      absMap.get(key)!.push(n);
      cur.setDate(cur.getDate() + 1);
    }
  });

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pl-PL', { month: 'long', year: 'numeric' });

  // Aggregate counts for header
  const urlopsCount = nieobecnosci.filter(n => {
    const inMonth = n.od.startsWith(`${year}-${String(month).padStart(2, '0')}`) ||
      n.do.startsWith(`${year}-${String(month).padStart(2, '0')}`);
    return n.typ === 'urlop' && inMonth;
  }).length;
  const chorobyCount = nieobecnosci.filter(n => {
    const inMonth = n.od.startsWith(`${year}-${String(month).padStart(2, '0')}`) ||
      n.do.startsWith(`${year}-${String(month).padStart(2, '0')}`);
    return n.typ === 'chory' && inMonth;
  }).length;

  return (
    <div>
      <div className="card">
        {/* Navigation */}
        <div className="flex items-center gap-12 mb-16" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="flex items-center gap-8">
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}>‹</button>
            <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: 180, textAlign: 'center', textTransform: 'capitalize' }}>
              {monthLabel}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth}>›</button>
          </div>
          <div className="flex gap-12">
            <div className="info-item">
              <div className="lbl">Urlopy</div>
              <div className="val" style={{ color: 'var(--info)' }}>{urlopsCount}</div>
            </div>
            <div className="info-item">
              <div className="lbl">Chorobowe</div>
              <div className="val" style={{ color: 'var(--warning)' }}>{chorobyCount}</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-12 mb-12">
          <div className="flex items-center gap-4">
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#dbeafe', display: 'inline-block' }} />
            <span className="text-xs text-muted">Urlop</span>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fef3c7', display: 'inline-block' }} />
            <span className="text-xs text-muted">Chorobowe</span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="calendar">
          {/* Day headers */}
          {DAYS_PL_SHORT.map(d => (
            <div key={d} className="calendar-header-cell">{d}</div>
          ))}

          {/* Empty cells before first day */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty" />
          ))}

          {/* Day cells */}
          {days.map(dateStr => {
            const absHere = absMap.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            return (
              <div key={dateStr} className={`calendar-day${isToday ? ' today' : ''}`}>
                <div className="calendar-day-num">{parseInt(dateStr.split('-')[2], 10)}</div>
                {absHere.slice(0, 3).map(n => {
                  const p = pracownicy.find(x => x.id === n.pracownik_id);
                  const name = p ? p.imie.charAt(0) + '. ' + p.nazwisko.split(' ')[0] : '?';
                  return (
                    <div
                      key={n.id}
                      className={`calendar-event ${n.typ === 'urlop' ? 'calendar-event-urlop' : 'calendar-event-chory'}`}
                      title={`${p ? p.imie + ' ' + p.nazwisko : '?'} – ${n.typ === 'urlop' ? 'Urlop' : 'Chorobowe'}`}
                    >
                      {name}
                    </div>
                  );
                })}
                {absHere.length > 3 && (
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>+{absHere.length - 3} wię...</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* List view */}
      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: '0.95rem', fontWeight: 600 }}>
          Nieobecności w {monthLabel}
        </h3>
        {(() => {
          const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
          const relevant = nieobecnosci.filter(n =>
            n.od.startsWith(monthPrefix) || n.do.startsWith(monthPrefix) ||
            (n.od < monthPrefix + '-01' && n.do >= monthPrefix + '-01')
          );
          if (relevant.length === 0) {
            return <p className="text-muted text-sm">Brak nieobecności w tym miesiącu.</p>;
          }
          return relevant
            .sort((a, b) => a.od.localeCompare(b.od))
            .map(n => {
              const p = pracownicy.find(x => x.id === n.pracownik_id);
              return (
                <div key={n.id} className="absence-row">
                  <div className="absence-name">{p ? `${p.imie} ${p.nazwisko}` : '—'}</div>
                  <span className={`badge ${n.typ === 'urlop' ? 'badge-info' : 'badge-warning'}`}>
                    {n.typ === 'urlop' ? 'Urlop' : 'Chory / L4'}
                  </span>
                  <div className="absence-period">
                    {n.od === n.do
                      ? formatDate(n.od)
                      : `${formatDate(n.od)} – ${formatDate(n.do)}`}
                  </div>
                  <div className="text-muted text-sm">
                    {(() => {
                      const od = new Date(n.od);
                      const doD = new Date(n.do);
                      const diff = Math.round((doD.getTime() - od.getTime()) / 86400000) + 1;
                      return `${diff} ${diff === 1 ? 'dzień' : 'dni'}`;
                    })()}
                  </div>
                </div>
              );
            });
        })()}
      </div>
    </div>
  );
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}
