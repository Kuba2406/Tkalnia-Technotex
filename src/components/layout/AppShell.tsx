'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SaveStatus from '@/components/ui/SaveStatus';

const NAV_ITEMS = [
  { href: '/artykuly', label: 'Artykuły', icon: '📄' },
  { href: '/zlecenia', label: 'Zlecenia prod.', icon: '📋' },
  { href: '/snowalnia', label: 'Snowalnia', icon: '🧵' },
  { href: '/klejarnia', label: 'Klejarnia', icon: '🔗' },
  { href: '/magazyn', label: 'Magazyn osnów', icon: '📦' },
  { href: '/przewlekalnia', label: 'Przewlekalnia', icon: '🔄' },
  { href: '/tkalnia', label: 'Tkalnia', icon: '🏭' },
  { href: '/obecnosci', label: 'Obecności', icon: '👥' },
  { href: '/zadania', label: 'Zadania', icon: '✅' },
  { href: '/historia', label: 'Historia', icon: '📜' },
  { href: '/ustawienia', label: 'Ustawienia', icon: '⚙️' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on nav (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div id="app-root">
      {/* Mobile toggle button */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Otwórz menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: 'fixed', inset: 0, zIndex: 140,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1>Tkalnia Technotex</h1>
          <p>Plan produkcji</p>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? ' active' : ''}`}
            >
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>

      {/* Global save status */}
      <SaveStatus />
    </div>
  );
}
