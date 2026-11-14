/**
 * Sultanahmet — oyuna özel arayüz: 6 parçalı ilerleme çubuğu, güneş saati, şarj halkası, bağlamsal ipuçları,
 * geri sarma bildirimi, motif kartı (kaynaklı) ve kazanma ekranı. Başka oyunlarla paylaşılmaz.
 */
import { ArrowLeft, ExternalLink, Sun, Volume2, VolumeX } from 'lucide-react';
import { Joystick } from '../core/Joystick';
import { MOTIF_INFO } from './assets/motifs';
import type { MotifId } from './layout';
import { STAGES } from './mechanics';

const clock = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

export interface HudState {
  stage: number; hour: number; charge: number; revealed: MotifId[]; done: boolean;
  near: boolean; distance: number | null; intro: boolean;
}

export function ProgressBar({ revealed, stage }: { revealed: MotifId[]; stage: number }) {
  return (
    <div className="flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={STAGES.length} aria-valuenow={revealed.length} aria-label="Açılan desenler">
      {STAGES.map((s, i) => (
        <span key={s.motif} title={MOTIF_INFO[s.motif].name}
          className={`h-2 w-8 rounded-full transition-colors sm:w-10 ${revealed.includes(s.motif) ? 'bg-amber-300' : i === stage ? 'animate-pulse bg-white/70' : 'bg-white/25'}`} />
      ))}
    </div>
  );
}

function ChargeRing({ value }: { value: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-label={`Işık doluyor: %${Math.round(value * 100)}`}>
      <circle cx="28" cy="28" r={r} fill="rgba(15,23,42,.55)" stroke="rgba(255,255,255,.2)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#fcd34d" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform="rotate(-90 28 28)" />
      <Sun x={18} y={18} width={20} height={20} color="#fde68a" />
    </svg>
  );
}

/** Oyuncunun durumuna göre tek satırlık ipucu: ne yapması gerektiğini söyler, cezalandırmaz */
export function hint(h: HudState): string {
  if (h.intro) return 'Avludan harime giriliyor… (atlamak için dokun)';
  if (h.charge > 0.02) return 'Böyle kal — ışık deseni dolduruyor.';
  if (h.distance === null) return 'Güneş hareket ediyor; yeni ışık havuzu birazdan belirecek.';
  if (h.distance < 6) return 'Altın halkanın içine gir ve dur.';
  return 'Zemindeki altın halkayı izle — ışık onu yavaşça sürükleyecek.';
}

export function Hud({ h, muted, onMute, onExit, toast }: { h: HudState; muted: boolean; onMute: () => void; onExit: () => void; toast: string | null }) {
  const st = STAGES[Math.min(h.stage, STAGES.length - 1)];
  const span = st.to - st.from, left = Math.max(0, st.to - h.hour), pct = span > 0 ? 1 - left / span : 0;
  return (
    <div className="pointer-events-none absolute inset-0 select-none text-white">
      <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2">
        <button onClick={onExit} className="grid h-11 w-11 place-items-center rounded-full bg-ink/70 backdrop-blur" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={onMute} className="grid h-11 w-11 place-items-center rounded-full bg-ink/70 backdrop-blur" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      </div>
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-2xl bg-ink/60 px-4 py-2 backdrop-blur">
        <ProgressBar revealed={h.revealed} stage={h.stage} />
        <p className="text-xs text-white/80">
          {h.revealed.length}/{STAGES.length} desen · <Sun size={12} className="inline -mt-0.5" /> {clock(h.hour)}
        </p>
        {!h.done && !h.intro && (
          <div className="h-1 w-40 overflow-hidden rounded-full bg-white/15" aria-label="Işık penceresi">
            <div className="h-full bg-gradient-to-r from-amber-200 to-orange-400" style={{ width: `${Math.min(100, pct * 100)}%` }} />
          </div>
        )}
      </div>
      {!h.done && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink/65 py-1.5 pl-1.5 pr-5 backdrop-blur" aria-live="polite">
          <ChargeRing value={h.charge} />
          <p className="max-w-[60vw] text-sm">{hint(h)}</p>
        </div>
      )}
      {toast && <p className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-ink shadow">{toast}</p>}
      {!h.done && !h.intro && <div className="pointer-events-auto absolute bottom-5 left-5"><Joystick /></div>}
    </div>
  );
}

export function RevealCard({ motif, onClose }: { motif: MotifId; onClose: () => void }) {
  const info = MOTIF_INFO[motif];
  return (
    <div className="absolute right-3 top-20 w-72 rounded-2xl bg-white p-4 text-ink shadow-xl" role="dialog" aria-label={`${info.name} deseni açıldı`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">Desen açıldı</p>
      <h3 className="mt-0.5 text-lg font-bold">{info.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{info.text}</p>
      <a href={info.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 underline">
        {info.source.title} <ExternalLink size={12} />
      </a>
      <button onClick={onClose} className="btn-primary mt-3 h-10 w-full">Devam</button>
    </div>
  );
}

export function WinScreen({ revealed, seconds, rewinds, onReplay, onExit }: { revealed: MotifId[]; seconds: number; rewinds: number; onReplay: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-brand">Gün batımı</p>
        <h2 className="mt-1 text-2xl font-bold">Altı desen de ışıkla buluştu</h2>
        <p className="mt-2 text-sm text-slate-600">
          Güneşi sabahtan akşama izledin. Gerçek camide de çinilerin rengi gün boyunca ışığın açısıyla değişir.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {revealed.map((m) => <span key={m} className="rounded-lg bg-amber-50 px-2 py-1.5 text-sm font-medium">{MOTIF_INFO[m].name}</span>)}
        </div>
        <p className="mt-3 text-xs text-slate-500">{Math.round(seconds / 60)} dk · {rewinds === 0 ? 'güneşi hiç geri sarmadan' : `${rewinds} kez geri sarıldı`}</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onReplay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Tekrar oyna</button>
          <button onClick={onExit} className="btn-primary h-11 flex-1">Haritaya dön</button>
        </div>
      </div>
    </div>
  );
}
