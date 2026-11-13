import {
  Check,
  CheckCheck,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { STATUS_LABELS } from '../../lib/i18n';
import {
  formatDateReadable,
  formatPrice,
  toLocalDateString,
} from '../../lib/slots';
import { bookingService } from '../../services/bookingService';
import type {
  Appointment,
  AppointmentStatus,
  Master,
  MasterSchedule,
  MasterTimeOff,
  SalonSettings,
  Service,
} from '../../types/booking';
import { StatusBadge } from '../StatusBadge';
import { NewBookingModal } from './NewBookingModal';

interface AppointmentsTabProps {
  appointments: Appointment[];
  services: Service[];
  masters: Master[];
  schedules: MasterSchedule[];
  timeOffs: MasterTimeOff[];
  settings: SalonSettings;
  onRefresh: () => Promise<void>;
}

export function AppointmentsTab({
  appointments,
  services,
  masters,
  schedules,
  timeOffs,
  settings,
  onRefresh,
}: AppointmentsTabProps) {
  const { lang, t } = useLanguage();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [masterFilter, setMasterFilter] = useState<string>('all');
  const [dateMode, setDateMode] = useState<'all' | 'today' | 'upcoming' | 'specific'>('all');
  const [specificDate, setSpecificDate] = useState(toLocalDateString(new Date()));
  const [showNewModal, setShowNewModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const todayStr = toLocalDateString(new Date());

  const serviceMap = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services]
  );
  const masterMap = useMemo(
    () => new Map(masters.map((m) => [m.id, m])),
    [masters]
  );

  const kpis = useMemo(() => {
    const todayCount = appointments.filter(
      (a) => a.appointment_date === todayStr && a.status !== 'cancelled'
    ).length;
    const pendingCount = appointments.filter((a) => a.status === 'pending').length;
    const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
    const revenue = appointments
      .filter((a) => a.status === 'confirmed' || a.status === 'completed')
      .reduce((acc, a) => acc + a.price, 0);

    return { todayCount, pendingCount, confirmedCount, revenue };
  }, [appointments, todayStr]);

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (masterFilter !== 'all' && a.master_id !== masterFilter) return false;
      if (dateMode === 'today' && a.appointment_date !== todayStr) return false;
      if (dateMode === 'upcoming' && a.appointment_date < todayStr) return false;
      if (dateMode === 'specific' && a.appointment_date !== specificDate) return false;

      if (q) {
        const hay = `${a.client_name} ${a.client_phone} ${a.booking_code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, masterFilter, dateMode, specificDate, search, todayStr]);

  const handleStatusChange = async (id: string, nextStatus: AppointmentStatus) => {
    if (nextStatus === 'cancelled' && !window.confirm(t.admin.confirmCancelPrompt)) {
      return;
    }
    setBusyId(id);
    try {
      await bookingService.updateAppointmentStatus(id, nextStatus);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await bookingService.deleteAppointment(id);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-4">
          <div className="text-xs text-[#6B6860]">{t.admin.kpi.today}</div>
          <div className="mt-1 text-2xl font-semibold text-[#1C1B18] tabular-nums">
            {kpis.todayCount}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-4">
          <div className="text-xs text-[#6B6860]">{t.admin.kpi.pending}</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700 tabular-nums">
            {kpis.pendingCount}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-4">
          <div className="text-xs text-[#6B6860]">{t.admin.kpi.confirmed}</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700 tabular-nums">
            {kpis.confirmedCount}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-4">
          <div className="text-xs text-[#6B6860]">{t.admin.kpi.revenue}</div>
          <div className="mt-1 text-2xl font-semibold text-[#1C1B18] tabular-nums">
            {formatPrice(kpis.revenue, settings.currency, lang)}
          </div>
        </div>
      </div>

      {/* Filters & Add Button */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E8E5DF] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B6860]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.filters.searchPlaceholder}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] py-2 pr-4 pl-10 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#8C5E3C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#734B2E]"
          >
            <Plus className="h-4 w-4" />
            {t.admin.actions.newBooking}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Status filter pills */}
          {(
            ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#1C1B18] text-white'
                  : 'border border-[#E8E5DF] bg-[#FAF9F6] text-[#6B6860] hover:text-[#1C1B18]'
              }`}
            >
              {st === 'all' ? t.admin.filters.allStatuses : STATUS_LABELS[lang][st]}
            </button>
          ))}

          <select
            value={masterFilter}
            onChange={(e) => setMasterFilter(e.target.value)}
            className="rounded-full border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-1 text-xs text-[#1C1B18] outline-none"
          >
            <option value="all">{t.admin.filters.allMasters}</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {lang === 'ru' ? m.name_ru : m.name_en}
              </option>
            ))}
          </select>

          <select
            value={dateMode}
            onChange={(e) =>
              setDateMode(e.target.value as 'all' | 'today' | 'upcoming' | 'specific')
            }
            className="rounded-full border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-1 text-xs text-[#1C1B18] outline-none"
          >
            <option value="all">{t.admin.filters.allDates}</option>
            <option value="today">{t.admin.filters.today}</option>
            <option value="upcoming">{t.admin.filters.upcoming}</option>
            <option value="specific">{t.admin.filters.specificDate}</option>
          </select>

          {dateMode === 'specific' && (
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="rounded-full border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-1 text-xs text-[#1C1B18]"
            />
          )}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-10 text-center text-sm text-[#6B6860]">
          {t.admin.appointmentsEmpty}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const service = serviceMap.get(appt.service_id);
            const master = masterMap.get(appt.master_id);
            const isBusy = busyId === appt.id;

            return (
              <div
                key={appt.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E8E5DF] bg-white p-4 transition-colors hover:border-[#8C5E3C]/40 lg:flex-row lg:items-center"
              >
                <div className="grid flex-1 gap-3 sm:grid-cols-4 sm:items-center">
                  {/* Date & Time */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-[#8C5E3C]">
                        {appt.booking_code}
                      </span>
                      <StatusBadge status={appt.status} lang={lang} />
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-[#1C1B18] tabular-nums">
                      {formatDateReadable(appt.appointment_date, lang)}
                    </div>
                    <div className="text-xs text-[#6B6860] tabular-nums">
                      {appt.start_time} – {appt.end_time}
                    </div>
                  </div>

                  {/* Client */}
                  <div>
                    <div className="text-sm font-medium text-[#1C1B18]">
                      {appt.client_name}
                    </div>
                    <div className="text-xs text-[#6B6860]">{appt.client_phone}</div>
                    {appt.notes && (
                      <div className="mt-1 line-clamp-1 text-xs italic text-[#6B6860]">
                        “{appt.notes}”
                      </div>
                    )}
                  </div>

                  {/* Service & Price */}
                  <div>
                    <div className="text-sm font-medium text-[#1C1B18]">
                      {service
                        ? lang === 'ru'
                          ? service.name_ru
                          : service.name_en
                        : '—'}
                    </div>
                    <div className="text-xs text-[#6B6860] tabular-nums">
                      {formatPrice(appt.price, settings.currency, lang)}
                    </div>
                  </div>

                  {/* Master */}
                  <div className="flex items-center gap-2.5">
                    {master && (
                      <img
                        src={master.avatar_url || '/images/master-1.jpg'}
                        alt={lang === 'ru' ? master.name_ru : master.name_en}
                        className="h-9 w-9 rounded-full border border-[#E8E5DF] object-cover"
                      />
                    )}
                    <div className="text-sm text-[#1C1B18]">
                      {master
                        ? lang === 'ru'
                          ? master.name_ru
                          : master.name_en
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 border-t border-[#E8E5DF] pt-3 lg:border-t-0 lg:pt-0">
                  {appt.status === 'pending' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStatusChange(appt.id, 'confirmed')}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t.admin.actions.confirm}
                    </button>
                  )}

                  {appt.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStatusChange(appt.id, 'completed')}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1C1B18] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#8C5E3C] disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {t.admin.actions.complete}
                    </button>
                  )}

                  {(appt.status === 'pending' || appt.status === 'confirmed') && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStatusChange(appt.id, 'cancelled')}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 transition-colors hover:bg-rose-100 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t.admin.actions.cancel}
                    </button>
                  )}

                  {appt.status === 'cancelled' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDelete(appt.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E8E5DF] px-3 py-1.5 text-xs font-medium text-[#6B6860] hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t.admin.actions.delete}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <NewBookingModal
          services={services}
          masters={masters}
          schedules={schedules}
          timeOffs={timeOffs}
          settings={settings}
          onClose={() => setShowNewModal(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}

