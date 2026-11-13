import { X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { STATUS_LABELS } from '../../lib/i18n';
import {
  computeAvailableSlots,
  formatDuration,
  formatPrice,
  toLocalDateString,
} from '../../lib/slots';
import { bookingService } from '../../services/bookingService';
import type {
  AppointmentStatus,
  Master,
  MasterSchedule,
  MasterTimeOff,
  SalonSettings,
  Service,
  TimeInterval,
} from '../../types/booking';

interface NewBookingModalProps {
  services: Service[];
  masters: Master[];
  schedules: MasterSchedule[];
  timeOffs: MasterTimeOff[];
  settings: SalonSettings;
  onClose: () => void;
  onCreated: () => void;
}

export function NewBookingModal({
  services,
  masters,
  schedules,
  timeOffs,
  settings,
  onClose,
  onCreated,
}: NewBookingModalProps) {
  const { lang, t } = useLanguage();

  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [masterId, setMasterId] = useState(masters[0]?.id ?? '');
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));
  const [startTime, setStartTime] = useState('12:00');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('confirmed');
  const [allowOverlap, setAllowOverlap] = useState(false);

  const [busyIntervals, setBusyIntervals] = useState<TimeInterval[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);

  const compatibleMasters = useMemo(() => {
    const filtered = masters.filter((m) => m.service_ids.includes(serviceId));
    return filtered.length > 0 ? filtered : masters;
  }, [masters, serviceId]);

  useEffect(() => {
    if (!compatibleMasters.some((m) => m.id === masterId) && compatibleMasters[0]) {
      setMasterId(compatibleMasters[0].id);
    }
  }, [compatibleMasters, masterId]);

  useEffect(() => {
    if (!masterId || !dateStr) return;
    bookingService
      .getBusyIntervals(masterId, dateStr)
      .then(setBusyIntervals)
      .catch(() => setBusyIntervals([]));
  }, [masterId, dateStr]);

  const suggestedSlots = useMemo(() => {
    if (!selectedService || !masterId || !dateStr) return [];
    return computeAvailableSlots({
      dateStr,
      durationMinutes: selectedService.duration_minutes,
      intervalMinutes: settings.slot_interval_minutes || 30,
      schedules: schedules.filter((s) => s.master_id === masterId),
      timeOffs: timeOffs.filter((o) => o.master_id === masterId),
      busyIntervals,
      minLeadMinutes: 0,
    });
  }, [selectedService, masterId, dateStr, settings.slot_interval_minutes, schedules, timeOffs, busyIntervals]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await bookingService.createAdminBooking({
        master_id: masterId,
        service_id: serviceId,
        appointment_date: dateStr,
        start_time: startTime,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        notes,
        status,
        allow_overlap: allowOverlap,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1B18]/40 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#E8E5DF] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-4">
          <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
            {t.admin.newBookingModal.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6B6860] hover:bg-[#F3F1EC] hover:text-[#1C1B18]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.booking.nameLabel} *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.booking.phoneLabel} *
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.booking.step1}
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ru' ? s.name_ru : s.name_en} (
                    {formatDuration(s.duration_minutes, lang)},{' '}
                    {formatPrice(s.price, settings.currency, lang)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.booking.step2}
              </label>
              <select
                value={masterId}
                onChange={(e) => setMasterId(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              >
                {compatibleMasters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {lang === 'ru' ? m.name_ru : m.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.booking.pickDate}
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.admin.newBookingModal.selectSlotOrCustom}
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm tabular-nums outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
          </div>

          {suggestedSlots.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] p-3">
              {suggestedSlots.slice(0, 12).map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setStartTime(slot.time)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                    startTime === slot.time
                      ? 'border-[#8C5E3C] bg-[#8C5E3C] text-white'
                      : 'border-[#E8E5DF] bg-white text-[#1C1B18] hover:border-[#8C5E3C]'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.admin.newBookingModal.statusLabel}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              >
                <option value="confirmed">{STATUS_LABELS[lang].confirmed}</option>
                <option value="pending">{STATUS_LABELS[lang].pending}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.booking.emailLabel}
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
              {t.booking.notesLabel}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#6B6860]">
            <input
              type="checkbox"
              checked={allowOverlap}
              onChange={(e) => setAllowOverlap(e.target.checked)}
              className="h-4 w-4 rounded accent-[#8C5E3C]"
            />
            {t.admin.newBookingModal.allowOverlap}
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[#E8E5DF] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E8E5DF] px-4 py-2 text-xs font-medium text-[#6B6860] hover:text-[#1C1B18]"
            >
              {t.admin.actions.close}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#1C1B18] px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#8C5E3C] disabled:opacity-50"
            >
              {t.admin.newBookingModal.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

