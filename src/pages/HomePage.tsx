import { ArrowRight, Clock, MapPin, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BookingWizard } from '../components/BookingWizard';
import { Footer } from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import { formatDuration, formatPrice } from '../lib/slots';
import type { CatalogData } from '../services/bookingService';

export function HomePage({ catalog }: { catalog: CatalogData }) {
  const { lang, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);
  const [preselectedMasterId, setPreselectedMasterId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of catalog.services) {
      set.add(lang === 'ru' ? s.category_ru : s.category_en);
    }
    return Array.from(set);
  }, [catalog.services, lang]);

  const filteredServices = useMemo(() => {
    if (activeCategory === 'all') return catalog.services;
    return catalog.services.filter(
      (s) => (lang === 'ru' ? s.category_ru : s.category_en) === activeCategory
    );
  }, [catalog.services, activeCategory, lang]);

  const scrollToBooking = () => {
    const el = document.getElementById('booking');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBookService = (serviceId: string) => {
    setPreselectedMasterId(null);
    setPreselectedServiceId(serviceId);
    scrollToBooking();
  };

  const handleBookMaster = (masterId: string) => {
    setPreselectedServiceId(null);
    setPreselectedMasterId(masterId);
    scrollToBooking();
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1B18]">
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 lg:pt-16 lg:pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E5DF] bg-white px-3.5 py-1 text-[11px] font-medium tracking-[0.16em] text-[#8C5E3C] uppercase">
              {t.hero.eyebrow}
            </div>

            <h1 className="mt-5 font-serif text-4xl leading-[1.08] font-medium tracking-tight text-[#1C1B18] sm:text-5xl lg:text-6xl">
              {t.hero.title}
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#6B6860]">
              {t.hero.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#booking"
                className="inline-flex items-center gap-2 rounded-full bg-[#1C1B18] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#8C5E3C]"
              >
                {t.hero.ctaBook}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full border border-[#E8E5DF] bg-white px-6 py-3 text-sm font-medium text-[#1C1B18] transition-colors hover:border-[#8C5E3C] hover:text-[#8C5E3C]"
              >
                {t.hero.ctaServices}
              </a>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-[#E8E5DF] pt-6 text-xs">
              <div>
                <div className="text-[#6B6860]">{t.hero.hoursLabel}</div>
                <div className="mt-1 font-medium text-[#1C1B18] tabular-nums">
                  {t.hero.hoursValue}
                </div>
              </div>
              <div>
                <div className="text-[#6B6860]">{t.hero.ratingLabel}</div>
                <div className="mt-1 flex items-center gap-1 font-medium text-[#1C1B18] tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-[#8C5E3C] text-[#8C5E3C]" />
                  4.9 / 5.0
                </div>
              </div>
              <div>
                <div className="text-[#6B6860]">Studio</div>
                <div className="mt-1 flex items-center gap-1 truncate font-medium text-[#1C1B18]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#8C5E3C]" />
                  <span className="truncate">
                    {lang === 'ru'
                      ? catalog.settings.address_ru
                      : catalog.settings.address_en}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-[#E8E5DF] bg-[#F3F1EC] shadow-sm">
              <img
                src="/images/hero-studio.jpg"
                alt={catalog.settings.salon_name}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="border-t border-[#E8E5DF] bg-white/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-[#8C5E3C] uppercase">
                {t.servicesSection.eyebrow}
              </div>
              <h2 className="mt-2 font-serif text-3xl font-medium text-[#1C1B18] sm:text-4xl">
                {t.servicesSection.title}
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-[#1C1B18] text-white'
                    : 'border border-[#E8E5DF] bg-white text-[#6B6860] hover:text-[#1C1B18]'
                }`}
              >
                {t.servicesSection.allCategories}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#1C1B18] text-white'
                      : 'border border-[#E8E5DF] bg-white text-[#6B6860] hover:text-[#1C1B18]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E8E5DF] bg-white p-6 transition-all hover:border-[#8C5E3C]/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium tracking-wider text-[#8C5E3C] uppercase">
                      {lang === 'ru' ? service.category_ru : service.category_en}
                    </span>
                    <span className="text-base font-semibold text-[#1C1B18] tabular-nums">
                      {formatPrice(service.price, catalog.settings.currency, lang)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-[#1C1B18]">
                    {lang === 'ru' ? service.name_ru : service.name_en}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#6B6860]">
                    {lang === 'ru' ? service.description_ru : service.description_en}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E8E5DF] pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#6B6860] tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-[#8C5E3C]" />
                    {formatDuration(service.duration_minutes, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBookService(service.id)}
                    className="text-xs font-medium text-[#8C5E3C] transition-colors hover:text-[#734B2E]"
                  >
                    {t.servicesSection.chooseToBook} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ONLINE BOOKING WIZARD */}
      <section id="booking" className="border-t border-[#E8E5DF] bg-[#FAF9F6] py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <div className="text-xs font-medium tracking-[0.18em] text-[#8C5E3C] uppercase">
              {t.booking.eyebrow}
            </div>
            <h2 className="mt-2 font-serif text-3xl font-medium text-[#1C1B18] sm:text-4xl">
              {t.booking.title}
            </h2>
            <p className="mt-2 text-sm text-[#6B6860]">{t.booking.subtitle}</p>
          </div>

          <div className="mt-10">
            <BookingWizard
              services={catalog.services}
              masters={catalog.masters}
              schedules={catalog.schedules}
              timeOffs={catalog.timeOffs}
              settings={catalog.settings}
              preselectedServiceId={preselectedServiceId}
              preselectedMasterId={preselectedMasterId}
            />
          </div>
        </div>
      </section>

      {/* STYLISTS */}
      <section id="masters" className="border-t border-[#E8E5DF] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div>
            <div className="text-xs font-medium tracking-[0.18em] text-[#8C5E3C] uppercase">
              {t.mastersSection.eyebrow}
            </div>
            <h2 className="mt-2 font-serif text-3xl font-medium text-[#1C1B18] sm:text-4xl">
              {t.mastersSection.title}
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.masters.map((master) => (
              <div
                key={master.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E8E5DF] bg-[#FAF9F6]"
              >
                <div>
                  <div className="aspect-square w-full overflow-hidden bg-[#F3F1EC]">
                    <img
                      src={master.avatar_url || '/images/master-1.jpg'}
                      alt={lang === 'ru' ? master.name_ru : master.name_en}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-medium text-[#1C1B18]">
                        {lang === 'ru' ? master.name_ru : master.name_en}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1B18] tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-[#8C5E3C] text-[#8C5E3C]" />
                        {master.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-[#8C5E3C]">
                      {lang === 'ru' ? master.role_ru : master.role_en}
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#6B6860]">
                      {lang === 'ru' ? master.bio_ru : master.bio_en}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#E8E5DF] px-5 py-3.5 text-xs">
                  <span className="text-[#6B6860] tabular-nums">
                    {t.mastersSection.experience}: {master.experience_years}{' '}
                    {t.mastersSection.years}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBookMaster(master.id)}
                    className="font-medium text-[#1C1B18] hover:text-[#8C5E3C]"
                  >
                    {t.mastersSection.bookWithMaster} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer settings={catalog.settings} />
    </div>
  );
}

