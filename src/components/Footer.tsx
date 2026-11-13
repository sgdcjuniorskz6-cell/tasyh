import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import type { SalonSettings } from '../types/booking';

export function Footer({ settings }: { settings: SalonSettings }) {
  const { lang, t } = useLanguage();
  const address = lang === 'ru' ? settings.address_ru : settings.address_en;

  return (
    <footer className="border-t border-[#E8E5DF] bg-[#F3F1EC]/70">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-serif text-2xl font-medium tracking-[0.12em] text-[#1C1B18] uppercase">
              {settings.salon_name}
            </div>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#6B6860]">
              {t.hero.subtitle}
            </p>
          </div>

          <div className="space-y-2.5 text-sm text-[#6B6860]">
            <div className="flex items-center gap-2.5 text-[#1C1B18]">
              <MapPin className="h-4 w-4 text-[#8C5E3C]" />
              <span>{address}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-[#8C5E3C]" />
              <a href={`tel:${settings.phone}`} className="hover:text-[#1C1B18]">
                {settings.phone}
              </a>
            </div>
            {settings.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-[#8C5E3C]" />
                <a href={`mailto:${settings.email}`} className="hover:text-[#1C1B18]">
                  {settings.email}
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-4 text-sm text-[#6B6860] md:items-end">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#8C5E3C]" />
              <span>{t.footer.hours}</span>
            </div>
            <Link
              to="/admin"
              className="text-xs font-medium text-[#8C5E3C] underline underline-offset-4 hover:text-[#734B2E]"
            >
              {t.footer.adminLink}
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-[#E8E5DF] pt-6 text-xs text-[#6B6860]">
          © {new Date().getFullYear()} {settings.salon_name}. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}

