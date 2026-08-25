'use client';

import type { Zlecenie, Artykul } from '@/types/domain';
import {
  formatDate, statusZleceniaLabel, statusZleceniaBadge,
  priorytetLabel, priorytetBadge,
} from '@/lib/utils/formatting';

interface Props {
  zlecenie: Zlecenie;
  artykul: Artykul | undefined;
  onEdit: (z: Zlecenie) => void;
  onDelete: (id: number) => void;
  onPrzekazDo: (z: Zlecenie, target: 'snowalnia' | 'klejarnia') => void;
}

export default function ZleceniaRow({ zlecenie: z, artykul: art, onEdit, onDelete, onPrzekazDo }: Props) {
  return (
    <tr>
      <td className="fw-600">{z.numer}</td>
      <td>{art?.nazwa || '—'}</td>
      <td>{z.ilosc_m.toLocaleString()} m</td>
      <td>{formatDate(z.termin_realizacji)}</td>
      <td>
        <span className={`badge ${priorytetBadge(z.priorytet)}`}>
          {priorytetLabel(z.priorytet)}
        </span>
      </td>
      <td>
        <span className={`badge ${statusZleceniaBadge(z.status)}`}>
          {statusZleceniaLabel(z.status)}
        </span>
      </td>
      <td>
        {z.przekazane_do ? (
          <span className="badge badge-purple">{z.przekazane_do === 'snowalnia' ? 'Snowalnia' : 'Klejarnia'}</span>
        ) : '—'}
      </td>
      <td>
        <div className="btn-group">
          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(z)}>Edytuj</button>
          {!z.przekazane_do && z.status !== 'zrealizowane' && art && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onPrzekazDo(z, art.rodzaj_snucia === 'zespołowe' ? 'klejarnia' : 'snowalnia')}
            >
              Przekaż → {art.rodzaj_snucia === 'zespołowe' ? 'Klejarnia' : 'Snowalnia'}
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(z.id)}>Usuń</button>
        </div>
      </td>
    </tr>
  );
}
