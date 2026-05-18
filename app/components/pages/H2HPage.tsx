'use client';

import { useState } from 'react';
import { Athlete } from '@/lib/types';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Props { athletes: Athlete[] }

const METRICS: { key: keyof Athlete['Latest']; label: string; hi: boolean; max: number }[] = [
  { key: 'Speed30', label: 'Speed', hi: false, max: 6 },
  { key: 'CMJ', label: 'CMJ', hi: true, max: 60 },
  { key: 'Agility', label: 'Agility', hi: false, max: 25 },
  { key: 'YoYo', label: 'Yo-Yo', hi: true, max: 2000 },
  { key: 'Pushup', label: 'Push-up', hi: true, max: 60 },
  { key: 'Situp', label: 'Sit-up', hi: true, max: 70 },
  { key: 'LongJump', label: 'Long Jump', hi: true, max: 280 },
  { key: 'SitAndReach', label: 'Sit&Reach', hi: true, max: 35 },
];

function normalize(val: string | number | undefined, hi: boolean, max: number): number {
  const v = Number(val) || 0;
  if (!v) return 0;
  return hi ? Math.min(100, (v / max) * 100) : Math.min(100, ((max - v) / max) * 100);
}

export default function H2HPage({ athletes }: Props) {
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');

  const playerA = athletes.find(a => a.PlayerID === idA);
  const playerB = athletes.find(a => a.PlayerID === idB);

  const dataA = METRICS.map(m => normalize(playerA?.Latest?.[m.key], m.hi, m.max));
  const dataB = METRICS.map(m => normalize(playerB?.Latest?.[m.key], m.hi, m.max));

  const radarData = {
    labels: METRICS.map(m => m.label),
    datasets: [
      {
        label: playerA?.Name || 'Player A',
        data: dataA,
        backgroundColor: 'rgba(56,189,248,0.2)',
        borderColor: '#38bdf8',
        borderWidth: 2,
        pointBackgroundColor: '#38bdf8',
      },
      {
        label: playerB?.Name || 'Player B',
        data: dataB,
        backgroundColor: 'rgba(244,114,182,0.2)',
        borderColor: '#f472b6',
        borderWidth: 2,
        pointBackgroundColor: '#f472b6',
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { display: false },
        grid: { color: 'rgba(15,23,42,0.07)' },
        pointLabels: { font: { size: 11, weight: 700 as const }, color: '#64748b' },
      },
    },
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { size: 12 }, padding: 20 } },
    },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Head-to-Head</h2>
          <p className="page-subtitle">Compare two athletes across all metrics</p>
        </div>
      </div>

      {/* Player select */}
      <div className="surface mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <div className="player-select-label label-a">Player A</div>
            <select className="form-select" value={idA} onChange={e => setIdA(e.target.value)} style={{ borderColor: idA ? '#38bdf8' : undefined }}>
              <option value="">Select athlete…</option>
              {athletes.map(a => <option key={a.PlayerID} value={a.PlayerID}>{a.Name} ({a.Team || a.Club || a.PlayerID})</option>)}
            </select>
          </div>
          <div className="col-md-2 text-center">
            <div className="h2h-vs">VS</div>
          </div>
          <div className="col-md-5">
            <div className="player-select-label label-b">Player B</div>
            <select className="form-select" value={idB} onChange={e => setIdB(e.target.value)} style={{ borderColor: idB ? '#f472b6' : undefined }}>
              <option value="">Select athlete…</option>
              {athletes.map(a => <option key={a.PlayerID} value={a.PlayerID}>{a.Name} ({a.Team || a.Club || a.PlayerID})</option>)}
            </select>
          </div>
        </div>
      </div>

      {(!playerA || !playerB) && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <i className="bi bi-bar-chart-steps" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }} />
          Select two athletes to compare
        </div>
      )}

      {playerA && playerB && (
        <>
          {/* Player cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-5">
              <div className="h2h-player-block side-a">
                <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.1rem', margin: '0 auto 12px' }}>
                  {playerA.PhotoUrl ? <img src={playerA.PhotoUrl} alt="" /> : (playerA.Name || '?')[0]}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{playerA.Name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{playerA.Team || playerA.Club}</div>
                {playerA.Latest?.Rating && (
                  <div className="score-pill" style={{ marginTop: 10 }}>Rating: {playerA.Latest.Rating}</div>
                )}
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-center justify-content-center">
              <div className="h2h-vs">VS</div>
            </div>
            <div className="col-md-5">
              <div className="h2h-player-block side-b">
                <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.1rem', margin: '0 auto 12px', background: 'linear-gradient(135deg,#f472b6,#ec4899)' }}>
                  {playerB.PhotoUrl ? <img src={playerB.PhotoUrl} alt="" /> : (playerB.Name || '?')[0]}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{playerB.Name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{playerB.Team || playerB.Club}</div>
                {playerB.Latest?.Rating && (
                  <div className="score-pill" style={{ marginTop: 10 }}>Rating: {playerB.Latest.Rating}</div>
                )}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="surface">
                <div className="section-hd"><i className="bi bi-hexagon" /> Radar Overview</div>
                <div className="h2h-radar-wrap">
                  <Radar data={radarData} options={radarOptions} />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="surface">
                <div className="section-hd"><i className="bi bi-bar-chart-line" /> Metric Breakdown</div>
                {METRICS.map(m => {
                  const vA = Number(playerA.Latest?.[m.key]) || 0;
                  const vB = Number(playerB.Latest?.[m.key]) || 0;
                  const nA = normalize(vA, m.hi, m.max);
                  const nB = normalize(vB, m.hi, m.max);
                  const diff = vA - vB;
                  const diffCls = diff === 0 ? 'diff-neu' : (m.hi ? (diff > 0 ? 'diff-pos' : 'diff-neg') : (diff < 0 ? 'diff-pos' : 'diff-neg'));
                  return (
                    <div key={m.key} className="metric-row">
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-bar-wrap">
                        <div className="bar-line">
                          <span className="bar-val a">{vA || '—'}</span>
                          <div className="bar-track"><div className="bar-fill a" style={{ width: `${nA}%` }} /></div>
                        </div>
                        <div className="bar-line">
                          <span className="bar-val b">{vB || '—'}</span>
                          <div className="bar-track"><div className="bar-fill b" style={{ width: `${nB}%` }} /></div>
                        </div>
                      </div>
                      <span className={`diff-badge ${diffCls}`}>
                        {diff === 0 ? '=' : (diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
