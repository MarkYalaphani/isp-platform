'use client';

export default function ISPLoader({ label = 'กำลังโหลดข้อมูล...' }: { label?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 320, gap: 28, userSelect: 'none',
    }}>

      {/* ── Goo blob loader ── */}
      <div className="isp-loader" aria-hidden="true">
        {/* SVG defines the clip mask with rotating triangles */}
        <svg width="0" height="0" style={{ position: 'absolute', overflow: 'visible' }}>
          <defs>
            <clipPath id="isp-clip" clipPathUnits="userSpaceOnUse">
              <g id="isp-blobs" style={{ filter: 'blur(9px) contrast(18)' }}>
                {/* Static center blob */}
                <polygon points="50,26 74,68 26,68" />
                {/* Rotating shapes — each has different speed, direction, origin */}
                <polygon points="50,18 80,72 20,72" className="isp-p2" />
                <polygon points="50,22 76,70 24,70" className="isp-p3" />
                <polygon points="34,20 80,52 34,82" className="isp-p4" />
                <polygon points="20,48 80,28 66,82" className="isp-p5" />
                <polygon points="50,14 82,70 18,70" className="isp-p6" />
                <polygon points="50,30 72,66 28,66" className="isp-p7" />
              </g>
            </clipPath>
          </defs>
        </svg>

        {/* Sphere underlay */}
        <div className="isp-sphere" />

        {/* Gradient fill through the clip mask */}
        <div className="isp-fill" style={{ clipPath: 'url(#isp-clip)' }} />

        {/* Center dot (not clipped) */}
        <div className="isp-dot" />
      </div>

      {/* Label */}
      <div className="isp-loader-label">{label}</div>

      <style>{`
        /* ── tokens ── */
        .isp-loader {
          --c1: #0070f3;
          --c2: #3b82f6;
          --c3: #60a5fa;
          --c1h: rgba(0,112,243,0.55);
          --c2h: rgba(59,130,246,0.35);
          --size: 100px;
          position: relative;
          width: var(--size);
          height: var(--size);
          border-radius: 50%;
          transform: scale(1);
          box-shadow:
            0 0 28px 0 var(--c2h),
            0 18px 48px 0 var(--c1h);
          animation: ispColorize 6s ease-in-out infinite;
        }

        /* ── Sphere base ── */
        .isp-sphere {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border-top:    1px solid var(--c2);
          border-bottom: 1px solid var(--c1);
          background: linear-gradient(180deg, rgba(41,151,255,0.18), rgba(0,102,204,0.32));
          box-shadow:
            inset 0  10px 14px 0 rgba(41,151,255,0.28),
            inset 0 -10px 14px 0 rgba(0,102,204,0.32);
        }

        /* ── Gradient fill applied through clip mask ── */
        .isp-fill {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, var(--c2) 20%, var(--c1) 80%);
          border-radius: 50%;
          overflow: hidden;
        }

        /* ── Center glow dot ── */
        .isp-dot {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 14px; height: 14px;
          border-radius: 50%;
          background: rgba(255,255,255,0.85);
          box-shadow: 0 0 10px 4px rgba(255,255,255,0.4);
          animation: ispDotPulse 1.5s ease-in-out infinite;
          pointer-events: none;
        }

        /* ── SVG polygon animations ── */
        #isp-blobs polygon {
          transform-box: fill-box;
        }

        /* roundness changes filter contrast for liquid merging effect */
        #isp-blobs {
          animation: ispRoundness 1s linear infinite;
        }

        .isp-p2 {
          transform-origin: 50% 50%;
          animation: ispRot 2s linear infinite reverse;
        }
        .isp-p3 {
          transform-origin: 50% 60%;
          animation: ispRot 1.6s linear infinite;
          animation-delay: -0.53s;
        }
        .isp-p4 {
          transform-origin: 40% 40%;
          animation: ispRot 2.4s linear infinite reverse;
          animation-delay: -0.8s;
        }
        .isp-p5 {
          transform-origin: 60% 45%;
          animation: ispRot 1.8s linear infinite;
          animation-delay: -0.6s;
        }
        .isp-p6 {
          transform-origin: 55% 55%;
          animation: ispRot 3s linear infinite reverse;
          animation-delay: -1s;
        }
        .isp-p7 {
          transform-origin: 45% 35%;
          animation: ispRot 1.3s linear infinite;
          animation-delay: -0.43s;
        }

        @keyframes ispRot {
          0%   { transform: rotate(0deg);   }
          100% { transform: rotate(360deg); }
        }

        @keyframes ispRoundness {
          0%   { filter: blur(9px) contrast(18); }
          20%  { filter: blur(6px) contrast(5);  }
          40%  { filter: blur(9px) contrast(18); }
          60%  { filter: blur(6px) contrast(4);  }
          80%  { filter: blur(8px) contrast(14); }
          100% { filter: blur(9px) contrast(18); }
        }

        @keyframes ispColorize {
          0%   { filter: hue-rotate(0deg);   }
          20%  { filter: hue-rotate(25deg);  }
          45%  { filter: hue-rotate(-18deg); }
          65%  { filter: hue-rotate(40deg);  }
          85%  { filter: hue-rotate(-10deg); }
          100% { filter: hue-rotate(0deg);   }
        }

        @keyframes ispDotPulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.9; }
          50%       { transform: translate(-50%,-50%) scale(1.4); opacity: 0.5; }
        }

        /* ── Label ── */
        .isp-loader-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted, #94a3b8);
          animation: ispLabelFade 1.5s ease-in-out infinite;
        }

        @keyframes ispLabelFade {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
