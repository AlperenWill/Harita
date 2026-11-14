import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Home, Map, Menu, Settings, X } from 'lucide-react';
import { Logo } from './Logo';
import { AssistantWidget } from './AssistantWidget';

const NAV = [
  { to: '/', label: 'Anasayfa', icon: Home, end: true },
  { to: '/harita', label: 'Harita', icon: Map },
  { to: '/kaynakca', label: 'Kaynakça', icon: BookOpen },
];

function NavItem({ to, label, icon: Icon, end, onClick }: { to: string; label: string; icon: typeof Home; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
          isActive ? 'bg-brand-50 text-brand' : 'text-ink-muted hover:bg-slate-50 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-brand" aria-hidden />}
          <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate, drawer }: { onNavigate?: () => void; drawer?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className={`px-3 pb-5 pt-4 ${drawer ? 'pr-16' : ''}`}>
        <Link to="/" onClick={onNavigate} className="flex h-12 items-center rounded-xl bg-ink px-4 text-2xl" aria-label="Miras. — Anasayfa">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Ana menü">
        {NAV.map((n) => <NavItem key={n.to} {...n} onClick={onNavigate} />)}
      </nav>
      <div className="border-t border-line px-3 py-3">
        <NavItem to="/ayarlar" label="Ayarlar" icon={Settings} onClick={onNavigate} />
      </div>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const fullBleed = pathname === '/harita' || pathname.startsWith('/anit/') || pathname.startsWith('/istanbul');   // 3D harita içerik alanının tamamını kaplar
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen">
      {/* Masaüstü sidebar (220px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] border-r border-line bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobil üst bar + çekmece */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <button className="btn-ghost h-10 w-10 !p-0" onClick={() => setOpen(true)} aria-label="Menüyü aç"><Menu size={20} /></button>
        <span className="rounded-lg bg-ink px-3 py-1 text-lg"><Logo /></span>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] animate-fade-up bg-white shadow-xl">
            <button className="absolute right-3 top-[22px] btn-ghost h-9 w-9 !p-0" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X size={18} /></button>
            <SidebarContent onNavigate={() => setOpen(false)} drawer />
          </aside>
        </div>
      )}

      <main className="lg:pl-[220px]">
        <div className={fullBleed ? '' : 'mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10'}>
          <Suspense fallback={<div className="grid min-h-[40vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <AssistantWidget />
    </div>
  );
}
