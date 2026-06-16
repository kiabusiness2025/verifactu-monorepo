'use client';

import Image from 'next/image';

// ── Constantes de layout ──────────────────────────────────────────────────────
const SIZE = 220; // stage px
const CX = SIZE / 2;
const CY = SIZE / 2;
const RI = 65; // radio anillo interior
const RO = 100; // radio anillo exterior
const HUB = 50; // tamaño avatar hub
const SPOKES = [0, 45, 90, 135, 180, 225, 270, 315];

function OrbitDot({
  angle,
  r,
  cntCls,
  lg,
}: {
  angle: number;
  r: number;
  cntCls: string;
  lg?: boolean;
}) {
  return (
    <div className="ic-arm" style={{ transform: `rotate(${angle}deg)` }}>
      <div style={{ transform: `translateX(${r}px)` }}>
        <div className={`ic-cnt ${cntCls}`}>
          <div className={lg ? 'ic-dot ic-dot-lg' : 'ic-dot'} />
        </div>
      </div>
    </div>
  );
}

export function IsaakConnecting({ className }: { className?: string }) {
  return (
    <>
      <style>{`
        .ic-stage   { position:relative; flex-shrink:0; }
        .ic-grid    { position:absolute; inset:0; border-radius:50%;
                      background-image:radial-gradient(circle,#a8bcd8 1px,transparent 1px);
                      background-size:20px 20px; opacity:.28; pointer-events:none; }
        .ic-glow    { position:absolute; left:50%; top:50%; width:140px; height:140px;
                      transform:translate(-50%,-50%);
                      background:radial-gradient(circle,rgba(35,97,216,.16) 0%,transparent 68%);
                      border-radius:50%; pointer-events:none; }
        .ic-track   { position:absolute; left:50%; top:50%; border-radius:50%;
                      border:1px solid rgba(35,97,216,.1); transform:translate(-50%,-50%); }
        .ic-ring    { position:absolute; left:50%; top:50%; width:0; height:0; }
        .ic-arm     { position:absolute; }
        .ic-cnt     { position:absolute; }
        .ic-dot     { width:7px; height:7px; border-radius:50%;
                      background:#2361d8; opacity:.55;
                      transform:translate(-50%,-50%);
                      box-shadow:0 0 5px rgba(35,97,216,.45); }
        .ic-dot-lg  { width:9px; height:9px; opacity:.72;
                      box-shadow:0 0 8px rgba(35,97,216,.55); }
        .ic-hub     { position:absolute; left:50%; top:50%; }
        .ic-hr      { position:absolute; border-radius:50%; border:2px solid rgba(35,97,216,.38);
                      animation:ic-hub-ring 5s ease-out infinite; }
        .ic-hr2     { animation-delay:1.7s; border-color:rgba(35,97,216,.2); }
        .ic-hr3     { animation-delay:3.4s; border-color:rgba(35,97,216,.12); }
        .ic-core    { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
                      border-radius:50%; overflow:hidden; background:#c8e0f8;
                      box-shadow:0 0 0 3px rgba(255,255,255,.9),
                                 0 0 0 6px rgba(35,97,216,.28),
                                 0 8px 24px rgba(35,97,216,.35); }
        .ic-spokes  { position:absolute; inset:0; width:100%; height:100%;
                      pointer-events:none; overflow:visible; }

        @keyframes ic-spin-cw  { to { transform:rotate( 360deg); } }
        @keyframes ic-spin-ccw { to { transform:rotate(-360deg); } }
        @keyframes ic-cnt-ccw  { from{transform:translate(-50%,-50%) rotate(  0deg)}
                                  to  {transform:translate(-50%,-50%) rotate(-360deg)} }
        @keyframes ic-cnt-cw   { from{transform:translate(-50%,-50%) rotate(  0deg)}
                                  to  {transform:translate(-50%,-50%) rotate( 360deg)} }
        @keyframes ic-hub-ring { 0%  {transform:translate(-50%,-50%) scale(1);  opacity:.7}
                                  100%{transform:translate(-50%,-50%) scale(3);  opacity:0} }
        @keyframes ic-dash     { from{stroke-dashoffset:200} to{stroke-dashoffset:0} }

        .ic-ring-i { animation:ic-spin-cw  22s linear infinite; }
        .ic-ring-o { animation:ic-spin-ccw 34s linear infinite; }
        .ic-cnt-i  { animation:ic-cnt-ccw  22s linear infinite; }
        .ic-cnt-o  { animation:ic-cnt-cw   34s linear infinite; }
      `}</style>

      <div className={`ic-stage ${className ?? ''}`} style={{ width: SIZE, height: SIZE }}>
        <div className="ic-grid" />
        <div className="ic-glow" />

        {/* Track rings decorativos */}
        <div className="ic-track" style={{ width: RI * 2 + 18, height: RI * 2 + 18 }} />
        <div className="ic-track" style={{ width: RO * 2 + 18, height: RO * 2 + 18 }} />

        {/* Spoke lines */}
        <svg className="ic-spokes">
          {SPOKES.map((angle, i) => {
            const a = ((angle - 90) * Math.PI) / 180;
            const x1 = CX + 28 * Math.cos(a),
              y1 = CY + 28 * Math.sin(a);
            const x2 = CX + 88 * Math.cos(a),
              y2 = CY + 88 * Math.sin(a);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#2361d8"
                strokeWidth="1.1"
                strokeDasharray="3 7"
                strokeOpacity="0.2"
                style={{ animation: `ic-dash 8s linear infinite`, animationDelay: `${i * 0.4}s` }}
              />
            );
          })}
        </svg>

        {/* Anillo interior — 4 grandes + 4 pequeños */}
        <div className="ic-ring ic-ring-i">
          {[0, 90, 180, 270].map((a) => (
            <OrbitDot key={`i-lg-${a}`} angle={a} r={RI} cntCls="ic-cnt-i" lg />
          ))}
          {[45, 135, 225, 315].map((a) => (
            <OrbitDot key={`i-sm-${a}`} angle={a} r={RI} cntCls="ic-cnt-i" />
          ))}
        </div>

        {/* Anillo exterior — 6 grandes + 6 pequeños */}
        <div className="ic-ring ic-ring-o">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <OrbitDot key={`o-lg-${a}`} angle={a} r={RO} cntCls="ic-cnt-o" lg />
          ))}
          {[30, 90, 150, 210, 270, 330].map((a) => (
            <OrbitDot key={`o-sm-${a}`} angle={a} r={RO} cntCls="ic-cnt-o" />
          ))}
        </div>

        {/* Hub central — avatar Isaak */}
        <div className="ic-hub">
          <div className="ic-hr" style={{ width: HUB + 14, height: HUB + 14 }} />
          <div className="ic-hr ic-hr2" style={{ width: HUB + 14, height: HUB + 14 }} />
          <div className="ic-hr ic-hr3" style={{ width: HUB + 14, height: HUB + 14 }} />
          <div className="ic-core" style={{ width: HUB, height: HUB }}>
            <Image
              src="/Personalidad/isaak-avatar-2.png"
              alt="Isaak"
              width={HUB}
              height={HUB}
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
              priority
            />
          </div>
        </div>
      </div>
    </>
  );
}
