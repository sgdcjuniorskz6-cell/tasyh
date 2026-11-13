import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { WEEKDAY_NAMES } from '../lib/i18n';
import {
  addDays,
  computeAvailableSlots,
  formatDateReadable,
  formatDuration,
  formatPrice,
  isMasterWorkingOnDate,
  toLocalDateString,
} from '../lib/slots';
import { bookingService } from '../services/bookingService';
import type {
  AvailableSlot,
  BookingConfirmation,
  Master,
  MasterSchedule,
  MasterTimeOff,
  SalonSettings,
  Service,
  TimeInterval,
} from '../types/booking';

interface BookingWizardProps {
  services: Service[];
  masters: Master[];
  schedules: MasterSchedule[];
  timeOffs: MasterTimeOff[];
  settings: SalonSettings;
  preselectedServiceId: string | null;
  preselectedMasterId: string | null;
}

export function BookingWizard({
  services,
  masters,
  schedules,
  timeOffs,
  settings,
  preselectedServiceId,
  preselectedMasterId,
}: BookingWizardProps) {
  const { lang, t } = useLanguage();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [busyIntervals, setBusyIntervals] = useState<TimeInterval[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // React to external selection from Services or Stylists sections
  useEffect(() => {
    if (preselectedServiceId) {
      setConfirmation(null);
      setSelectedServiceId(preselectedServiceId);
      setSelectedTime(null);
      // Reset master if they don't perform the newly picked service
      if (selectedMasterId) {
        const master = masters.find((m) => m.id === selectedMasterId);
        if (master && !master.service_ids.includes(preselectedServiceId)) {
          setSelectedMasterId(null);
          setStep(2);
          return;
        }
        setStep(3);
        return;
      }
      setStep(2);
    }
  }, [preselectedServiceId, masters, selectedMasterId]);

  useEffect(() => {
    if (preselectedMasterId) {
      setConfirmation(null);
      setSelectedMasterId(preselectedMasterId);
      setSelectedTime(null);
      const master = masters.find((m) => m.id === preselectedMasterId);
      if (
        selectedServiceId &&
        master &&
        master.service_ids.includes(selectedServiceId)
      ) {
        setStep(3);
      } else {
        setSelectedServiceId(null);
        setStep(1);
      }
    }
  }, [preselectedMasterId, masters, selectedServiceId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const selectedMaster = useMemo(
    () => masters.find((m) => m.id === selectedMasterId) ?? null,
    [masters, selectedMasterId]
  );

  // Services shown in Step 1 (filtered by category and optionally by pre-chosen master)
  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const s of services) {
      unique.add(lang === 'ru' ? s.category_ru : s.category_en);
    }
    return Array.from(unique);
  }, [services, lang]);

  const displayedServices = useMemo(() => {
    return services.filter((s) => {
      if (selectedMaster && step === 1 && preselectedMasterId === selectedMaster.id) {
        if (!selectedMaster.service_ids.includes(s.id)) return false;
      }
      if (categoryFilter === 'all') return true;
      const cat = lang === 'ru' ? s.category_ru : s.category_en;
      return cat === categoryFilter;
    });
  }, [services, categoryFilter, lang, selectedMaster, step, preselectedMasterId]);

  // Masters filtered for Step 2
  const eligibleMasters = useMemo(() => {
    if (!selectedServiceId) return masters;
    return masters.filter((m) => m.service_ids.includes(selectedServiceId));
  }, [masters, selectedServiceId]);

  // Schedules & timeOffs for selected master
  const masterSchedules = useMemo(
    () => schedules.filter((s) => s.master_id === selectedMasterId),
    [schedules, selectedMasterId]
  );

  const masterTimeOffs = useMemo(
    () => timeOffs.filter((o) => o.master_id === selectedMasterId),
    [timeOffs, selectedMasterId]
  );

  // Generate date horizon options
  const dateOptions = useMemo(() => {
    const horizon = settings.booking_horizon_days || 21;
    const today = new Date();
    return Array.from({ length: horizon }, (_, idx) => {
      const d = addDays(today, idx);
      const dateStr = toLocalDateString(d);
      const working = selectedMasterId
        ? isMasterWorkingOnDate(dateStr, masterSchedules, masterTimeOffs)
        : true;
      return {
        dateStr,
        dayNum: d.getDate(),
        weekday: WEEKDAY_NAMES[lang][d.getDay()],
        monthShort: new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
          month: 'short',
        }).format(d),
        working,
      };
    });
  }, [settings.booking_horizon_days, selectedMasterId, masterSchedules, masterTimeOffs, lang]);

  // Auto-select first working date when entering Step 3 or switching master
  useEffect(() => {
    if (!selectedMasterId) return;
    const currentOpt = dateOptions.find((d) => d.dateStr === selectedDate);
    if (!selectedDate || !currentOpt || !currentOpt.working) {
      const firstWorking = dateOptions.find((d) => d.working);
      if (firstWorking) {
        setSelectedDate(firstWorking.dateStr);
        setSelectedTime(null);
      }
    }
  }, [selectedMasterId, dateOptions, selectedDate]);

  // Fetch busy intervals whenever master + date change
  useEffect(() => {
    if (!selectedMasterId || !selectedDate) {
      setBusyIntervals([]);
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);

    bookingService
      .getBusyIntervals(selectedMasterId, selectedDate)
      .then((intervals) => {
        if (!cancelled) setBusyIntervals(intervals);
      })
      .catch(() => {
        if (!cancelled) setBusyIntervals([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMasterId, selectedDate]);

  const availableSlots = useMemo<AvailableSlot[]>(() => {
    if (!selectedService || !selectedMasterId || !selectedDate) return [];
    return computeAvailableSlots({
      dateStr: selectedDate,
      durationMinutes: selectedService.duration_minutes,
      intervalMinutes: settings.slot_interval_minutes || 30,
      schedules: masterSchedules,
      timeOffs: masterTimeOffs,
      busyIntervals,
    });
  }, [
    selectedService,
    selectedMasterId,
    selectedDate,
    settings.slot_interval_minutes,
    masterSchedules,
    masterTimeOffs,
    busyIntervals,
  ]);

  const groupedSlots = useMemo(() => {
    return {
      morning: availableSlots.filter((s) => s.period === 'morning'),
      afternoon: availableSlots.filter((s) => s.period === 'afternoon'),
      evening: availableSlots.filter((s) => s.period === 'evening'),
    };
  }, [availableSlots]);

  const selectedSlotObj = useMemo(
    () => availableSlots.find((s) => s.time === selectedTime) ?? null,
    [availableSlots, selectedTime]
  );

  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedTime(null);
    if (selectedMasterId) {
      const master = masters.find((m) => m.id === selectedMasterId);
      if (master && master.service_ids.includes(serviceId)) {
        setStep(3);
        return;
      }
      setSelectedMasterId(null);
    }
    setStep(2);
  };

  const handleSelectMaster = (masterId: string) => {
    setSelectedMasterId(masterId);
    setSelectedTime(null);
    setStep(3);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedMaster || !selectedDate || !selectedTime) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await bookingService.createPublicBooking({
        master_id: selectedMaster.id,
        service_id: selectedService.id,
        appointment_date: selectedDate,
        start_time: selectedTime,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        notes,
      });
      setConfirmation(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete booking';
      setSubmitError(msg);
      // Refresh intervals in case the slot was taken just now
      const fresh = await bookingService.getBusyIntervals(
        selectedMaster.id,
        selectedDate
      );
      setBusyIntervals(fresh);
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setConfirmation(null);
    setStep(1);
    setSelectedServiceId(null);
    setSelectedMasterId(null);
    setSelectedTime(null);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setSubmitError(null);
  };

  const stepsMeta = [
    { num: 1 as const, label: t.booking.step1 },
    { num: 2 as const, label: t.booking.step2 },
    { num: 3 as const, label: t.booking.step3 },
    { num: 4 as const, label: t.booking.step4 },
  ];

  const canJumpToStep = (target: 1 | 2 | 3 | 4) => {
    if (target === 1) return true;
    if (target === 2) return Boolean(selectedServiceId);
    if (target === 3) return Boolean(selectedServiceId && selectedMasterId);
    if (target === 4) return Boolean(selectedServiceId && selectedMasterId && selectedDate && selectedTime);
    return false;
  };

  if (confirmation && selectedService && selectedMaster) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#E8E5DF] bg-white p-8 shadow-sm sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-5 font-serif text-3xl font-medium text-[#1C1B18]">
            {t.booking.confirmedTitle}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6B6860]">
            {t.booking.confirmedDesc}
          </p>

          <div className="mt-6 inline-flex flex-col items-center rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-6 py-3">
            <span className="text-[11px] font-medium tracking-widest text-[#6B6860] uppercase">
              {t.booking.bookingCodeLabel}
            </span>
            <span className="mt-1 font-mono text-2xl font-semibold tracking-wider text-[#8C5E3C]">
              {confirmation.booking_code}
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-3 rounded-xl border border-[#E8E5DF] bg-[#FAF9F6]/70 p-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#6B6860]">{t.booking.step1}</span>
            <span className="font-medium text-[#1C1B18]">
              {lang === 'ru' ? selectedService.name_ru : selectedService.name_en}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B6860]">{t.booking.step2}</span>
            <span className="font-medium text-[#1C1B18]">
              {lang === 'ru' ? selectedMaster.name_ru : selectedMaster.name_en}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B6860]">{t.booking.step3}</span>
            <span className="font-medium text-[#1C1B18] tabular-nums">
              {formatDateReadable(confirmation.appointment_date, lang)},{' '}
              {confirmation.start_time} – {confirmation.end_time}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-[#E8E5DF] pt-3">
            <span className="text-[#6B6860]">{t.booking.statusPendingNote}</span>
            <span className="text-base font-semibold text-[#1C1B18] tabular-nums">
              {formatPrice(confirmation.price, settings.currency, lang)}
            </span>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={resetWizard}
            className="rounded-full bg-[#1C1B18] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#8C5E3C]"
          >
            {t.booking.bookAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E8E5DF] bg-white shadow-sm">
      {/* Stepper Header */}
      <div className="border-b border-[#E8E5DF] bg-[#FAF9F6]/70 px-4 py-4 sm:px-8">
        <div className="grid grid-cols-4 gap-2">
          {stepsMeta.map((item) => {
            const active = step === item.num;
            const completed = step > item.num;
            const clickable = canJumpToStep(item.num);
            return (
              <button
                key={item.num}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setStep(item.num)}
                className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:justify-start sm:px-3 ${
                  active
                    ? 'bg-[#1C1B18] text-white'
                    : completed
                      ? 'bg-[#F3F1EC] text-[#1C1B18] hover:bg-[#E8E5DF]'
                      : 'text-[#6B6860]/60'
                } ${clickable && !active ? 'cursor-pointer' : ''}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    active
                      ? 'bg-white/20 text-white'
                      : completed
                        ? 'bg-[#8C5E3C] text-white'
                        : 'border border-[#E8E5DF] bg-white text-[#6B6860]'
                  }`}
                >
                  {completed ? <Check className="h-3 w-3" /> : item.num}
                </span>
                <span className="hidden truncate sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Body */}
      <div className="p-5 sm:p-8">
        {/* STEP 1: SERVICE */}
        {step === 1 && (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
                {t.booking.selectServicePrompt}
              </h3>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-[#1C1B18] text-white'
                      : 'border border-[#E8E5DF] bg-[#FAF9F6] text-[#6B6860] hover:text-[#1C1B18]'
                  }`}
                >
                  {t.servicesSection.allCategories}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#1C1B18] text-white'
                        : 'border border-[#E8E5DF] bg-[#FAF9F6] text-[#6B6860] hover:text-[#1C1B18]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {selectedMaster && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#8C5E3C]/25 bg-[#8C5E3C]/5 px-4 py-2.5 text-xs text-[#1C1B18]">
                <span>
                  {t.booking.step2}:{' '}
                  <strong>
                    {lang === 'ru' ? selectedMaster.name_ru : selectedMaster.name_en}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMasterId(null)}
                  className="font-medium text-[#8C5E3C] hover:underline"
                >
                  {t.booking.changeService}
                </button>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {displayedServices.map((service) => {
                const selected = service.id === selectedServiceId;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleSelectService(service.id)}
                    className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-[#8C5E3C] bg-[#FAF9F6] ring-1 ring-[#8C5E3C]'
                        : 'border-[#E8E5DF] bg-white hover:border-[#8C5E3C]/60 hover:bg-[#FAF9F6]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[11px] font-medium tracking-wider text-[#8C5E3C] uppercase">
                          {lang === 'ru' ? service.category_ru : service.category_en}
                        </span>
                        <span className="font-semibold text-[#1C1B18] tabular-nums">
                          {formatPrice(service.price, settings.currency, lang)}
                        </span>
                      </div>
                      <h4 className="mt-1.5 text-base font-medium text-[#1C1B18] group-hover:text-[#8C5E3C]">
                        {lang === 'ru' ? service.name_ru : service.name_en}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6B6860]">
                        {lang === 'ru' ? service.description_ru : service.description_en}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-[#6B6860]">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="h-3.5 w-3.5 text-[#8C5E3C]" />
                        {formatDuration(service.duration_minutes, lang)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-[#1C1B18] opacity-70 group-hover:opacity-100">
                        {t.booking.next}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: MASTER */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
                  {t.booking.selectMasterPrompt}
                </h3>
                {selectedService && (
                  <p className="mt-1 text-xs text-[#6B6860]">
                    {lang === 'ru' ? selectedService.name_ru : selectedService.name_en} ·{' '}
                    {formatDuration(selectedService.duration_minutes, lang)} ·{' '}
                    {formatPrice(selectedService.price, settings.currency, lang)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6860] hover:text-[#1C1B18]"
              >
                <ChevronLeft className="h-4 w-4" />
                {t.booking.back}
              </button>
            </div>

            {eligibleMasters.length === 0 ? (
              <div className="mt-6 rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] p-8 text-center text-sm text-[#6B6860]">
                {t.booking.noMastersForService}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {eligibleMasters.map((master) => {
                  const selected = master.id === selectedMasterId;
                  return (
                    <button
                      key={master.id}
                      type="button"
                      onClick={() => handleSelectMaster(master.id)}
                      className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-[#8C5E3C] bg-[#FAF9F6] ring-1 ring-[#8C5E3C]'
                          : 'border-[#E8E5DF] bg-white hover:border-[#8C5E3C]/60 hover:bg-[#FAF9F6]/50'
                      }`}
                    >
                      <img
                        src={master.avatar_url || '/images/master-1.jpg'}
                        alt={lang === 'ru' ? master.name_ru : master.name_en}
                        className="h-16 w-16 shrink-0 rounded-full border border-[#E8E5DF] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate text-base font-medium text-[#1C1B18] group-hover:text-[#8C5E3C]">
                            {lang === 'ru' ? master.name_ru : master.name_en}
                          </h4>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#1C1B18] tabular-nums">
                            <Star className="h-3.5 w-3.5 fill-[#8C5E3C] text-[#8C5E3C]" />
                            {master.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#8C5E3C]">
                          {lang === 'ru' ? master.role_ru : master.role_en}
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#6B6860]">
                          {lang === 'ru' ? master.bio_ru : master.bio_en}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: DATE & TIME */}
        {step === 3 && (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
                  {t.booking.selectDateTimePrompt}
                </h3>
                {selectedService && selectedMaster && (
                  <p className="mt-1 text-xs text-[#6B6860]">
                    {lang === 'ru' ? selectedService.name_ru : selectedService.name_en} ·{' '}
                    {lang === 'ru' ? selectedMaster.name_ru : selectedMaster.name_en}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6860] hover:text-[#1C1B18]"
              >
                <ChevronLeft className="h-4 w-4" />
                {t.booking.back}
              </button>
            </div>

            {/* Date Horizontal Strip */}
            <div className="mt-6">
              <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-[#6B6860]">
                <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
                  <CalendarDays className="h-3.5 w-3.5 text-[#8C5E3C]" />
                  {t.booking.pickDate}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  min={dateOptions[0]?.dateStr}
                  max={dateOptions[dateOptions.length - 1]?.dateStr}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setSelectedTime(null);
                    }
                  }}
                  className="rounded-lg border border-[#E8E5DF] bg-[#FAF9F6] px-2.5 py-1 text-xs text-[#1C1B18]"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {dateOptions.map((opt) => {
                  const isSelected = opt.dateStr === selectedDate;
                  return (
                    <button
                      key={opt.dateStr}
                      type="button"
                      disabled={!opt.working}
                      onClick={() => {
                        setSelectedDate(opt.dateStr);
                        setSelectedTime(null);
                      }}
                      className={`flex min-w-[70px] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 transition-all ${
                        !opt.working
                          ? 'cursor-not-allowed border-[#E8E5DF]/60 bg-[#F3F1EC]/50 text-[#6B6860]/50'
                          : isSelected
                            ? 'border-[#1C1B18] bg-[#1C1B18] text-white shadow-sm'
                            : 'border-[#E8E5DF] bg-white text-[#1C1B18] hover:border-[#8C5E3C]'
                      }`}
                    >
                      <span className="text-[11px] uppercase opacity-75">
                        {opt.weekday}
                      </span>
                      <span className="mt-0.5 text-lg font-semibold tabular-nums">
                        {opt.dayNum}
                      </span>
                      <span className="text-[10px] opacity-75">
                        {opt.working ? opt.monthShort : t.booking.dayOffBadge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Available Times */}
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#6B6860]">
                <Clock className="h-3.5 w-3.5 text-[#8C5E3C]" />
                {t.booking.pickTime}
              </div>

              {loadingSlots ? (
                <div className="rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] py-10 text-center text-sm text-[#6B6860]">
                  {t.booking.loadingSlots}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] py-10 text-center text-sm text-[#6B6860]">
                  {t.booking.noSlotsForDate}
                </div>
              ) : (
                <div className="space-y-4">
                  {(
                    [
                      { key: 'morning', label: t.booking.morning, list: groupedSlots.morning },
                      {
                        key: 'afternoon',
                        label: t.booking.afternoon,
                        list: groupedSlots.afternoon,
                      },
                      { key: 'evening', label: t.booking.evening, list: groupedSlots.evening },
                    ] as const
                  )
                    .filter((group) => group.list.length > 0)
                    .map((group) => (
                      <div key={group.key}>
                        <div className="mb-2 text-xs font-medium text-[#6B6860]">
                          {group.label}
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {group.list.map((slot) => {
                            const active = slot.time === selectedTime;
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => setSelectedTime(slot.time)}
                                className={`rounded-xl border py-2.5 text-sm font-medium tabular-nums transition-all ${
                                  active
                                    ? 'border-[#8C5E3C] bg-[#8C5E3C] text-white shadow-sm'
                                    : 'border-[#E8E5DF] bg-[#FAF9F6] text-[#1C1B18] hover:border-[#8C5E3C] hover:bg-white'
                                }`}
                              >
                                {slot.time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end border-t border-[#E8E5DF] pt-5">
              <button
                type="button"
                disabled={!selectedTime}
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 rounded-full bg-[#1C1B18] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#8C5E3C] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.booking.next}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONTACT DETAILS */}
        {step === 4 && selectedService && selectedMaster && (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
                {t.booking.contactPrompt}
              </h3>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6860] hover:text-[#1C1B18]"
              >
                <ChevronLeft className="h-4 w-4" />
                {t.booking.back}
              </button>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-5">
              <div className="space-y-4 lg:col-span-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#1C1B18]">
                    {t.booking.nameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={t.booking.namePlaceholder}
                    className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-4 py-2.5 text-sm text-[#1C1B18] outline-none transition-colors focus:border-[#8C5E3C] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#1C1B18]">
                    {t.booking.phoneLabel} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder={t.booking.phonePlaceholder}
                    className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-4 py-2.5 text-sm text-[#1C1B18] outline-none transition-colors focus:border-[#8C5E3C] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#1C1B18]">
                    {t.booking.emailLabel}
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder={t.booking.emailPlaceholder}
                    className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-4 py-2.5 text-sm text-[#1C1B18] outline-none transition-colors focus:border-[#8C5E3C] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#1C1B18]">
                    {t.booking.notesLabel}
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.booking.notesPlaceholder}
                    className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-4 py-2.5 text-sm text-[#1C1B18] outline-none transition-colors focus:border-[#8C5E3C] focus:bg-white"
                  />
                </div>

                {submitError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                    {submitError}
                  </div>
                )}
              </div>

              {/* Sticky Summary Card */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-[#E8E5DF] bg-[#FAF9F6] p-5">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#8C5E3C]">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t.booking.summaryTitle}
                  </div>

                  <div className="mt-4 space-y-3.5 text-sm">
                    <div>
                      <div className="text-xs text-[#6B6860]">{t.booking.step1}</div>
                      <div className="font-medium text-[#1C1B18]">
                        {lang === 'ru' ? selectedService.name_ru : selectedService.name_en}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={selectedMaster.avatar_url || '/images/master-1.jpg'}
                        alt={lang === 'ru' ? selectedMaster.name_ru : selectedMaster.name_en}
                        className="h-10 w-10 rounded-full border border-[#E8E5DF] object-cover"
                      />
                      <div>
                        <div className="text-xs text-[#6B6860]">{t.booking.step2}</div>
                        <div className="font-medium text-[#1C1B18]">
                          {lang === 'ru' ? selectedMaster.name_ru : selectedMaster.name_en}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-[#6B6860]">{t.booking.step3}</div>
                      <div className="font-medium text-[#1C1B18] tabular-nums">
                        {formatDateReadable(selectedDate, lang)}
                      </div>
                      <div className="text-xs text-[#6B6860] tabular-nums">
                        {selectedTime}
                        {selectedSlotObj ? ` – ${selectedSlotObj.endTime}` : ''} (
                        {formatDuration(selectedService.duration_minutes, lang)})
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-[#E8E5DF] pt-3">
                      <span className="text-xs text-[#6B6860]">
                        <User className="mr-1 inline h-3.5 w-3.5" />
                        {clientName.trim() || '—'}
                      </span>
                      <span className="text-lg font-semibold text-[#1C1B18] tabular-nums">
                        {formatPrice(selectedService.price, settings.currency, lang)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-5 w-full rounded-full bg-[#8C5E3C] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#734B2E] disabled:opacity-50"
                  >
                    {submitting ? t.booking.submitting : t.booking.confirmBooking}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

