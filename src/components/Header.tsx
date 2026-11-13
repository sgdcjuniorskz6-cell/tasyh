import { ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export function Header({ salonName }: { salonName: string }) {
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E5DF] bg-[#FAF9F6]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-baseline gap-2.5 text-[#1C1B18] transition-opacity hover:opacity-80"
        >
          <span className="font-serif text-2xl font-medium tracking-[0.14em] uppercase">
            {salonName.split(' ')[0] || 'LINEA'}
          </span>
          <span className="hidden text-xs tracking-[0.2em] text-[#6B6860] uppercase sm:inline">
            Hair Studio
          </span>
        </Link>

        {!isAdminRoute ? (
          <nav className="hidden items-center gap-7 text-sm text-[#6B6860] md:flex">
            <a href="#services" className="transition-colors hover:text-[#1C1B18]">
              {t.nav.services}
            </a>
            <a href="#masters" className="transition-colors hover:text-[#1C1B18]">
              {t.nav.masters}
            </a>
            <a href="#booking" className="transition-colors hover:text-[#1C1B18]">
              {t.nav.booking}
            </a>
          </nav>
        ) : (
          <div className="hidden text-xs font-medium tracking-wider text-[#6B6860] uppercase sm:block">
            {t.admin.title}
          </div>
        )}

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Language Switcher */}
          <div
            className="inline-flex rounded-full border border-[#E8E5DF] bg-white p-0.5 text-xs font-medium"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => setLang('ru')}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                lang === 'ru'
                  ? 'bg-[#1C1B18] text-white'
                  : 'text-[#6B6860] hover:text-[#1C1B18]'
              }`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                lang === 'en'
                  ? 'bg-[#1C1B18] text-white'
                  : 'text-[#6B6860] hover:text-[#1C1B18]'
              }`}
            >
              EN
            </button>
          </div>

          <Link
            to={isAdminRoute ? '/' : '/admin'}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E5DF] bg-white px-3 py-1.5 text-xs font-medium text-[#1C1B18] transition-colors hover:border-[#8C5E3C] hover:text-[#8C5E3C]"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isAdminRoute ? t.admin.backToSite : t.nav.admin}</span>
          </Link>

          {!isAdminRoute && (
            <a
              href="#booking"
              className="hidden rounded-full bg-[#1C1B18] px-4 py-2 text-xs font-medium tracking-wide text-white transition-colors hover:bg-[#8C5E3C] sm:inline-flex"
            >
              {t.nav.bookNow}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

