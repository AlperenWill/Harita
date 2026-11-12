import { useState } from 'react';
import { MessageSquareX, RotateCcw, Sparkles } from 'lucide-react';
import { resetProgress, useProgress } from '../lib/progress';
import { clearChat } from '../components/AssistantWidget';

export default function SettingsPage() {
  const progress = useProgress();
  const [reduce, setReduce] = useState(() => document.documentElement.classList.contains('reduce-motion'));
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const toggleReduce = () => {
    const v = !reduce; setReduce(v);
    document.documentElement.classList.toggle('reduce-motion', v);
    try { localStorage.setItem('tk-reduce-motion', v ? '1' : '0'); } catch { /* yok */ }
  };

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Ayarlar</h1>
        <p className="mt-2 text-ink-muted">Tercihlerin ve ilerlemen yalnızca bu tarayıcıda saklanır.</p>
      </header>
      <div className="card divide-y divide-line">
        <Row icon={Sparkles} title="Animasyonları azalt" desc="Geçiş ve hareket efektlerini kapatır.">
          <button role="switch" aria-checked={reduce} onClick={toggleReduce}
            className={`relative h-7 w-12 rounded-full transition ${reduce ? 'bg-brand' : 'bg-slate-200'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${reduce ? 'left-6' : 'left-1'}`} />
          </button>
        </Row>
        <Row icon={RotateCcw} title="İlerlemeyi sıfırla" desc={`${Object.keys(progress.sites).length} oyun skoru ve test sonucu silinir.`}>
          <button className="btn-ghost h-10 px-4 text-sm text-brand"
            onClick={() => { if (confirm('Tüm skorlar silinsin mi?')) { resetProgress(); flash('İlerleme sıfırlandı.'); } }}>Sıfırla</button>
        </Row>
        <Row icon={MessageSquareX} title="Sohbet geçmişini temizle" desc="AI asistan konuşmalarını siler (sayfa yenilenince uygulanır).">
          <button className="btn-ghost h-10 px-4 text-sm" onClick={() => { clearChat(); flash('Sohbet geçmişi temizlendi.'); }}>Temizle</button>
        </Row>
      </div>
      {msg && <p className="mt-4 text-sm font-medium text-emerald-700" role="status">{msg}</p>}
    </div>
  );
}

function Row({ icon: Icon, title, desc, children }: { icon: typeof Sparkles; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand"><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-ink-muted">{desc}</p>
      </div>
      {children}
    </div>
  );
}
