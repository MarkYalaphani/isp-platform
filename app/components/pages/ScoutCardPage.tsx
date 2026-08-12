'use client';

import { useState, useEffect } from 'react';
import { Athlete, Page } from '@/lib/types';
import AthleteSearchSelect from '../AthleteSearchSelect';
import ScoutCardBody from '../ScoutCardBody';

interface Props {
  athletes: Athlete[];
  initialId: string;
  onNavigate: (page: Page, id?: string) => void;
}

export default function ScoutCardPage({ athletes, initialId }: Props) {
  const [playerId, setPlayerId] = useState(initialId || athletes[0]?.PlayerID || '');

  useEffect(() => {
    if (initialId) setPlayerId(initialId);
  }, [initialId]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
          <i className="bi bi-person-vcard-fill me-1" />เลือกนักกีฬา
        </label>
        <div style={{ maxWidth: 420 }}>
          <AthleteSearchSelect athletes={athletes} value={playerId} onChange={setPlayerId} accentColor="#34d399" />
        </div>
      </div>

      {playerId ? (
        <ScoutCardBody
          playerId={playerId}
          embedded
          linkHref={`/athlete/${playerId}/card`}
          linkLabel="เปิดแบบเต็มจอ / แชร์ลิงก์"
          linkExternal
        />
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="bi bi-person-vcard" style={{ fontSize: '2.4rem', display: 'block', marginBottom: 10 }} />
          กรุณาเลือกนักกีฬาเพื่อดู Scout Card
        </div>
      )}
    </div>
  );
}
