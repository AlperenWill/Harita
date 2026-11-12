import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <p className="text-5xl font-extrabold text-brand">404</p>
      <p className="mt-2 text-ink-muted">Aradığın sayfa bulunamadı.</p>
      <Link to="/" className="btn-primary mt-6 h-11 px-6">Anasayfaya dön</Link>
    </div>
  );
}
