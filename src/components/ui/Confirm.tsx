'use client';

import Modal from './Modal';

interface ConfirmProps {
  open: boolean;
  title?: string;
  message: string;
  detail?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmClass?: string;
}

export default function Confirm({
  open,
  title = 'Potwierdzenie',
  message,
  detail,
  onConfirm,
  onCancel,
  confirmLabel = 'Tak',
  confirmClass = 'btn-primary',
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} narrow>
      <p style={{ fontSize: '.9rem', lineHeight: 1.6 }}>{message}</p>
      {detail && <p className="text-muted text-sm mt-8">{detail}</p>}
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Nie</button>
        <button className={`btn ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
