/**
 * MİRAS OYUN ARAYÜZÜ (HUD) — bütün oyunlar için tek düzen.
 *
 * Yerleşim (telefon dikey ekran önce, çentik/güvenli alan payı dahil):
 *  ┌──────────────────────────────────────────┐
 *  │ [← Harita]       [görev · ilerleme]      [≡] │  üst sıra: geri her zaman sol üstte, menü sağ üstte
 *  │ [araç paneli]                              │  sol: oyuna özel gösterge (ör. rüzgâr katmanları), daraltılabilir
 *  │                                    [gezinme]│  sağ kenar: ikincil düğmeler
 *  │              [geri bildirim]               │  üst orta: kısa bildirim (doğru/yanlış)
 *  │          [ipucu]                 [ANA]     │  alt: ipucu ortada, ana kontrol sağ altta (başparmak)
 *  │ ╭──────── bilgi paneli (alttan) ───────╮   │  kartlar alttan açılır; masaüstünde sağda
 *  └──────────────────────────────────────────┘
 * Tema: sitenin açık dili. Sıcak beyaz cam (beyaz + bulanıklık), mürekkep rengi yazı, ince çizgi.
 * Oyuna özgü tek şey VURGU rengidir (accent): ana düğme, ilerleme, başlık üstü etiket.
 */
import { useSettings, urlQuality, type Quality } from './settings';
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, BatteryLow, BookOpen, ExternalLink, HelpCircle, Menu, RotateCcw, Settings, Volume2, VolumeX, X, Captions, CaptionsOff, Map as MapIcon, Play } from 'lucide-react';

/* ---------- tema ---------- */
export interface HudTheme { accent: string; accentInk?: string }
const ThemeCtx = createContext<HudTheme>({ accent: '#f04448', accentInk: '#ffffff' });
const useTheme = () => useContext(ThemeCtx);
const stop = (e: React.PointerEvent) => e.stopPropagation();
const GLASS = 'bg-[#f7f5f1]/85 text-[#1f1b17] shadow-[0_6px_24px_rgba(31,27,23,0.14)] ring-1 ring-black/5 backdrop-blur-md';
const SOLID = 'bg-[#f7f5f1] text-[#1f1b17] shadow-[0_18px_50px_rgba(31,27,23,0.25)] ring-1 ring-black/5';

/** Bütün HUD'u saran katman: güvenli alanlar, tema değişkenleri. Sahneye dokunuşları engellemez. */
export function Hud({ theme, children }: { theme: HudTheme; children: ReactNode }) {
  const style = { '--accent': theme.accent, '--accent-ink': theme.accentInk ?? '#fff', paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))' } as CSSProperties;
  return <ThemeCtx.Provider value={theme}><div className="pointer-events-none absolute inset-0 z-30 font-sans text-[#1f1b17]" style={style}>{children}</div></ThemeCtx.Provider>;
}

/* ---------- temel düğmeler ---------- */
export function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  const t = useTheme();
  return <button onClick={onClick} onPointerDown={stop} aria-label={label} title={label} aria-pressed={active}
    className={`pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95 ${GLASS}`} style={active ? { background: t.accent, color: t.accentInk ?? '#fff' } : undefined}>{children}</button>;
}
/** Sol üst: haritaya dön — her oyunda aynı yerde, aynı biçimde */
export function BackButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} onPointerDown={stop} aria-label="Haritaya dön" className={`pointer-events-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-4 text-sm font-semibold transition active:scale-95 ${GLASS}`}><ArrowLeft size={18} /><span>Harita</span></button>;
}

/* ---------- üst sıra ---------- */
/** Üst sıra: sol geri, orta görev, sağ ses + menü. Telefonda görev ikinci satıra iner. */
export function TopBar({ onExit, objective, right }: { onExit: () => void; objective?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <BackButton onClick={onExit} />
      {objective && <div className="order-3 flex w-full justify-center sm:order-none sm:w-auto sm:flex-1">{objective}</div>}
      <div className="ml-auto flex gap-2">{right}</div>
    </div>
  );
}
/** Görev rozeti: şimdiki hedef + ilerleme (nokta ya da çubuk) */
export function Objective({ label, done, total, icon }: { label: ReactNode; done: number; total: number; icon?: ReactNode }) {
  const t = useTheme();
  return (
    <div className={`pointer-events-none flex max-w-[92vw] items-center gap-2.5 rounded-2xl px-3.5 py-2 ${GLASS}`} role="status">
      {icon && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: `${t.accent}22`, color: t.accent }}>{icon}</span>}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight">{label}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex gap-1">{Array.from({ length: total }, (_, i) => <span key={i} className="h-1.5 w-4 rounded-full transition-colors" style={{ background: i < done ? t.accent : 'rgba(31,27,23,0.14)' }} />)}</div>
          <span className="text-[11px] font-semibold text-[#857b70]">{done}/{total}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- menü (≡) ----------
 * Konya / Antalya oyunlarındaki duraklatma menüsü gibi: tek düğme, açılınca oyun durur; alt alta tam genişlikte seçenekler.
 * Ana görünüm: Devam et · Nasıl oynanır · Ayarlar · Baştan başla · Haritaya dön. Ayarlar ayrı sayfa: ses, sesli anlatım. */
export function GameMenu({ help, onRestart, onExit, onPause, tts = true, look = true }: { help?: ReactNode; onRestart?: () => void; onExit: () => void; onPause?: (paused: boolean) => void; /** sesli anlatım ayarı gösterilsin mi */ tts?: boolean; /** bakış hassasiyeti ayarı gösterilsin mi */ look?: boolean }) {
  const [view, setView] = useState<null | 'main' | 'settings' | 'help'>(null);
  const open = (v: typeof view) => { setView(v); onPause?.(v !== null); };
  const t = useTheme(), st = useSettings();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === 'Escape') open(view ? null : 'main'); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); });
  return (<>
    <IconButton label="Menü" onClick={() => open('main')}><Menu size={20} /></IconButton>
    {view === 'main' && <Modal title="Duraklatıldı" onClose={() => open(null)}>
      <div className="grid gap-2">
        <button onClick={() => open(null)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold" style={{ background: t.accent, color: t.accentInk ?? '#fff' }}><Play size={16} /> Devam et</button>
        {help && <MenuRow icon={<HelpCircle size={18} />} label="Nasıl oynanır" onClick={() => setView('help')} />}
        <MenuRow icon={<Settings size={18} />} label="Ayarlar" onClick={() => setView('settings')} />
        {onRestart && <MenuRow icon={<RotateCcw size={18} />} label="Baştan başla" onClick={() => { open(null); onRestart(); }} />}
        <MenuRow icon={<MapIcon size={18} />} label="Haritaya dön" onClick={onExit} />
      </div>
    </Modal>}
    {view === 'settings' && <Modal title="Ayarlar" onClose={() => open(null)}>
      <div className="grid gap-3">
        <Section title="Görüntü">
          <Segmented label="Grafik kalitesi" value={urlQuality() ?? st.quality} disabled={!!urlQuality()} options={[['auto', 'Otomatik'], ['low', 'Düşük'], ['medium', 'Orta'], ['high', 'Yüksek']]} onChange={(v) => st.set({ quality: v as Quality, battery: false })} />
          <p className="px-1 text-[11px] leading-snug text-[#857b70]">{urlQuality() ? 'Kalite adresteki ?q= ile sabitlendi.' : st.quality === 'auto' ? 'Otomatik: cihaza göre seçilir, takılırsa kendiliğinden düşer.' : 'Seçtiğin kalite sabit kalır. Yüksek kalite pili daha çabuk tüketir.'}</p>
          <Toggle icon={<BatteryLow size={18} />} label="Pil tasarrufu" on={st.battery} onClick={() => st.set({ battery: !st.battery })} />
        </Section>
        <Section title="Ses">
          <Toggle icon={st.muted ? <VolumeX size={18} /> : <Volume2 size={18} />} label="Ses" on={!st.muted} onClick={() => st.set({ muted: !st.muted })} />
          <Slider label="Ses seviyesi" value={st.volume} disabled={st.muted} onChange={(v) => st.set({ volume: v })} />
          {tts && <Toggle icon={st.tts ? <Captions size={18} /> : <CaptionsOff size={18} />} label="Sesli anlatım" on={st.tts} onClick={() => st.set({ tts: !st.tts })} />}
        </Section>
        {look && <Section title="Kontrol"><Slider label="Bakış hassasiyeti" value={(st.sensitivity - 0.4) / 1.6} onChange={(v) => st.set({ sensitivity: 0.4 + v * 1.6 })} format={() => `${st.sensitivity.toFixed(1)}×`} /></Section>}
        <MenuRow icon={<ArrowLeft size={18} />} label="Geri" onClick={() => setView('main')} />
      </div>
    </Modal>}
    {view === 'help' && <Modal title="Nasıl oynanır" onClose={() => open(null)}>{help}<div className="mt-3"><MenuRow icon={<ArrowLeft size={18} />} label="Geri" onClick={() => setView('main')} /></div></Modal>}
  </>);
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div><p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#857b70]">{title}</p><div className="grid gap-2">{children}</div></div>;
}
function Segmented({ label, value, options, onChange, disabled }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; disabled?: boolean }) {
  const t = useTheme();
  return <div className={`rounded-xl px-3 py-2.5 ring-1 ring-black/5 ${disabled ? 'opacity-60' : ''}`}><p className="mb-2 text-sm font-semibold">{label}</p>
    <div className="grid grid-cols-4 gap-1 rounded-lg bg-black/[0.05] p-1" role="radiogroup" aria-label={label}>{options.map(([v, l]) => <button key={v} role="radio" aria-checked={value === v} disabled={disabled} onClick={() => onChange(v)} className={`h-9 rounded-md text-xs font-semibold transition ${value === v ? 'shadow-sm' : 'text-[#4a433c]'}`} style={value === v ? { background: t.accent, color: t.accentInk ?? '#fff' } : undefined}>{l}</button>)}</div></div>;
}
function Slider({ label, value, onChange, disabled, format }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; format?: () => string }) {
  const t = useTheme();
  return <label className={`block rounded-xl px-3 py-2.5 ring-1 ring-black/5 ${disabled ? 'opacity-50' : ''}`}><span className="flex text-sm font-semibold">{label}<span className="ml-auto text-xs text-[#857b70]">{format ? format() : `%${Math.round(value * 100)}`}</span></span>
    <input type="range" min={0} max={1} step={0.05} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full" style={{ accentColor: t.accent }} /></label>;
}
function Toggle({ icon, label, on, onClick }: { icon: ReactNode; label: string; on: boolean; onClick: () => void }) {
  const t = useTheme();
  return <button onClick={onClick} role="switch" aria-checked={on} className="flex h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ring-1 ring-black/5 transition hover:bg-black/[0.03]">{icon}<span className="flex-1">{label}</span>
    <span className="relative h-6 w-10 rounded-full transition-colors" style={{ background: on ? t.accent : 'rgba(31,27,23,0.18)' }}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} /></span></button>;
}
function MenuRow({ icon, label, value, onClick }: { icon: ReactNode; label: string; value?: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ring-1 ring-black/5 transition hover:bg-black/[0.03] active:scale-[0.99]">{icon}<span className="flex-1">{label}</span>{value && <span className="text-xs font-semibold text-[#857b70]">{value}</span>}</button>;
}
/** Ortada açılan pencere (menü, yardım, bitiş) */
export function Modal({ title, onClose, children, wide }: { title?: string; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-[#1f1b17]/30 p-4 backdrop-blur-[2px]" onPointerDown={stop} onClick={onClose}>
      <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'} max-h-[86vh] overflow-y-auto rounded-3xl p-5 ${SOLID}`} onClick={(e) => e.stopPropagation()}>
        {(title || onClose) && <div className="mb-3 flex items-center gap-2">{title && <h2 className="text-lg font-bold">{title}</h2>}{onClose && <button onClick={onClose} className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-black/5" aria-label="Kapat"><X size={18} /></button>}</div>}
        {children}
      </div>
    </div>
  );
}
/** Kontrol listesi (başlangıç ekranı ve yardım için): simge + açıklama */
export function Controls({ items }: { items: { icon: ReactNode; text: ReactNode }[] }) {
  return <ul className="grid gap-1.5">{items.map((it, i) => <li key={i} className="flex items-center gap-2.5 text-[13px] text-[#4a433c]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/[0.05]">{it.icon}</span><span>{it.text}</span></li>)}</ul>;
}

/* ---------- alt bölge ---------- */
/** Alt ipucu: ilk etkileşimden birkaç saniye sonra kendiliğinden solar */
export function Hint({ children, fadeAfter = 7000 }: { children: ReactNode; fadeAfter?: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(true); const t = setTimeout(() => setOn(false), fadeAfter); return () => clearTimeout(t); }, [children, fadeAfter]);
  return <div className={`pointer-events-none absolute inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] flex justify-center px-24 transition-opacity duration-700 ${on ? 'opacity-100' : 'opacity-0'}`}><p className={`rounded-full px-4 py-2 text-center text-xs font-medium ${GLASS}`}>{children}</p></div>;
}
/** Sağ alt ana kontrol yuvası (başparmak bölgesi) */
export function ActionDock({ children }: { children: ReactNode }) {
  return <div className="pointer-events-auto absolute bottom-[max(16px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] flex flex-col items-center gap-3" onPointerDown={stop}>{children}</div>;
}
/** Yuvarlak ana düğme (vurgu renginde) ya da ikincil (cam) */
export function RoundAction({ label, primary, size = 64, children, ...handlers }: { label: string; primary?: boolean; size?: number; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const t = useTheme();
  return <button {...handlers} aria-label={label} title={label} className={`grid place-items-center rounded-full transition active:scale-95 ${primary ? 'shadow-[0_10px_30px_rgba(31,27,23,0.3)]' : GLASS}`} style={{ width: size, height: size, ...(primary ? { background: t.accent, color: t.accentInk ?? '#fff' } : {}) }}>{children}</button>;
}
/** Sol araç paneli: oyuna özel gösterge; telefonda başlığa dokununca daralır */
export function ToolPanel({ title, children, defaultOpen = true }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`pointer-events-auto absolute left-[max(12px,env(safe-area-inset-left))] top-[118px] w-max max-w-[46vw] rounded-2xl p-2.5 sm:top-[72px] ${GLASS}`} onPointerDown={stop}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-1 text-left text-xs font-bold" aria-expanded={open}>{title}<span className="ml-auto pl-2 text-[#857b70]">{open ? '−' : '+'}</span></button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

/* ---------- bilgi paneli ---------- */
/** Alttan açılan bilgi paneli; masaüstünde sağ altta kart */
export function InfoSheet({ kicker, title, text, source, onClose, onListen }: { kicker: string; title: string; text: string; source?: { title: string; url: string }; onClose: () => void; onListen?: () => void }) {
  const t = useTheme();
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center sm:inset-x-auto sm:bottom-[max(16px,env(safe-area-inset-bottom))] sm:right-[max(96px,env(safe-area-inset-right))]" onPointerDown={stop}>
      <div className={`max-h-[56vh] w-full overflow-y-auto rounded-t-3xl px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 sm:w-[400px] sm:rounded-3xl sm:pb-5 ${SOLID}`}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15 sm:hidden" />
        <div className="flex items-start gap-3">
          <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: t.accent }}>{kicker}</p><h2 className="mt-0.5 text-xl font-bold leading-snug">{title}</h2></div>
          <button onClick={onClose} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5" aria-label="Kapat"><X size={18} /></button>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-[#4a433c]">{text}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {onListen && <button onClick={onListen} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ring-1 ring-black/10"><Play size={13} /> Dinle</button>}
          {source && <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#857b70] underline underline-offset-2">{source.title} <ExternalLink size={12} /></a>}
        </div>
      </div>
    </div>
  );
}
/** Üst ortada kısa bildirim (doğru / yanlış / bilgi) */
export function Toast({ text, tone = 'info' }: { text: string | null; tone?: 'ok' | 'bad' | 'info' }) {
  if (!text) return null;
  const c = tone === 'ok' ? '#1f9d63' : tone === 'bad' ? '#d14343' : '#1f1b17';
  return <div className="pointer-events-none absolute inset-x-0 top-[124px] flex justify-center px-4 sm:top-[72px]"><p className={`rounded-full px-4 py-2 text-center text-sm font-semibold ${GLASS}`} style={{ color: c }}>{text}</p></div>;
}

/* ---------- başlangıç ve bitiş ---------- */
/** Başlangıç ekranı: alttan kart; üstte sahne görünür kalır */
export function StartSheet({ kicker, title, intro, controls, note, cta, ctaIcon, onStart, onExit }: { kicker: string; title: string; intro: ReactNode; controls: { icon: ReactNode; text: ReactNode }[]; note?: string; cta: string; ctaIcon?: ReactNode; onStart: () => void; onExit: () => void }) {
  const t = useTheme();
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-gradient-to-t from-[#1f1b17]/45 via-transparent to-transparent sm:items-center sm:bg-[#1f1b17]/20" onPointerDown={stop}>
      <div className={`w-full max-w-lg rounded-t-3xl px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 sm:rounded-3xl sm:pb-6 ${SOLID}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: t.accent }}>{kicker}</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
        <div className="mt-2 text-[15px] leading-relaxed text-[#4a433c]">{intro}</div>
        <div className="mt-3"><Controls items={controls} /></div>
        {note && <p className="mt-3 text-[11px] text-[#857b70]">{note}</p>}
        <button onClick={onStart} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold shadow-[0_8px_20px_rgba(31,27,23,0.18)] transition active:scale-[0.99]" style={{ background: t.accent, color: t.accentInk ?? '#fff' }}>{ctaIcon}{cta}</button>
        <button onClick={onExit} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 text-sm font-semibold text-[#857b70]"><ArrowLeft size={15} /> Haritaya dön</button>
      </div>
    </div>
  );
}
/** Bitiş penceresi */
export function EndSheet({ kicker, title, text, onStay, stayLabel = 'Gezmeye devam', onExit, onRestart, badge }: { kicker: string; title: string; text: string; onStay: () => void; stayLabel?: string; onExit: () => void; onRestart?: () => void; badge?: ReactNode }) {
  const t = useTheme();
  return (
    <Modal>
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: `${t.accent}22`, color: t.accent }}>{badge ?? <BookOpen size={24} />}</div>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: t.accent }}>{kicker}</p>
        <h2 className="mt-1 text-2xl font-extrabold leading-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#4a433c]">{text}</p>
        <div className="mt-5 grid gap-2">
          <button onClick={onExit} className="h-12 rounded-2xl text-[15px] font-bold" style={{ background: t.accent, color: t.accentInk ?? '#fff' }}>Haritaya dön</button>
          <div className="flex gap-2"><button onClick={onStay} className="h-11 flex-1 rounded-2xl text-sm font-semibold ring-1 ring-black/10">{stayLabel}</button>{onRestart && <button onClick={onRestart} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold ring-1 ring-black/10"><RotateCcw size={15} /> Baştan</button>}</div>
        </div>
      </div>
    </Modal>
  );
}
