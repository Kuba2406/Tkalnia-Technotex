'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
  narrow?: boolean;
}

export default function Modal({ open, onClose, title, children, wide, narrow }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const cls = `modal${wide ? ' modal-wide' : ''}${narrow ? ' modal-narrow' : ''}`;

  const content = (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={cls}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Zamknij">×</button>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );

  // Render via portal so modal is always at body level
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}
