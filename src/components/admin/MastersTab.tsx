import { CalendarOff, Plus, Save, Trash2, UserCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { WEEKDAY_FULL } from '../../lib/i18n';
import { toLocalDateString } from '../../lib/slots';
import { bookingService } from '../../services/bookingService';
import type {
  Master,
  MasterSchedule,
  MasterTimeOff,
  Service,
} from '../../types/booking';

interface MastersTabProps {
  masters: Master[];
  services: Service[];
  schedules: MasterSchedule[];
  timeOffs: MasterTimeOff[];
  onRefresh: () => Promise<void>;
}

const ORDERED_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

export function MastersTab({
  masters,
  services,
  schedules,
  timeOffs,
  onRefresh,
}: MastersTabProps) {
  const { lang, t } = useLanguage();

  const [selectedMasterId, setSelectedMasterId] = useState<string>(
    masters[0]?.id ?? 'new'
  );

  // Master profile form state
  const [nameRu, setNameRu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [roleRu, setRoleRu] = useState('');
  const [roleEn, setRoleEn] = useState('');
  const [bioRu, setBioRu] = useState('');
  const [bioEn, setBioEn] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('/images/master-1.jpg');
  const [experienceYears, setExperienceYears] = useState(3);
  const [rating, setRating] = useState(4.9);
  const [isActive, setIsActive] = useState(true);
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  // Weekly schedule editor state
  const [draftSchedules, setDraftSchedules] = useState<MasterSchedule[]>([]);

  // Time-off state
  const [offDate, setOffDate] = useState(toLocalDateString(new Date()));
  const [offReason, setOffReason] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selectedMaster =
    selectedMasterId === 'new'
      ? null
      : masters.find((m) => m.id === selectedMasterId) ?? null;

  useEffect(() => {
    if (selectedMaster) {
      setNameRu(selectedMaster.name_ru);
      setNameEn(selectedMaster.name_en);
      setRoleRu(selectedMaster.role_ru);
      setRoleEn(selectedMaster.role_en);
      setBioRu(selectedMaster.bio_ru);
      setBioEn(selectedMaster.bio_en);
      setAvatarUrl(selectedMaster.avatar_url || '/images/master-1.jpg');
      setExperienceYears(selectedMaster.experience_years);
      setRating(selectedMaster.rating);
      setIsActive(selectedMaster.is_active);
      setServiceIds(selectedMaster.service_ids);

      const masterScheds = schedules.filter((s) => s.master_id === selectedMaster.id);
      const normalized = ORDERED_WEEKDAYS.map((dow) => {
        const existing = masterScheds.find((s) => s.day_of_week === dow);
        return (
          existing ?? {
            id: `temp-${selectedMaster.id}-${dow}`,
            master_id: selectedMaster.id,
            day_of_week: dow,
            is_working: dow !== 0,
            start_time: '10:00',
            end_time: '20:00',
            break_start: '14:00',
            break_end: '15:00',
          }
        );
      });
      setDraftSchedules(normalized);
    } else if (selectedMasterId === 'new') {
      setNameRu('');
      setNameEn('');
      setRoleRu('');
      setRoleEn('');
      setBioRu('');
      setBioEn('');
      setAvatarUrl('/images/master-1.jpg');
      setExperienceYears(3);
      setRating(4.9);
      setIsActive(true);
      setServiceIds(services.map((s) => s.id));
      setDraftSchedules([]);
    }
  }, [selectedMaster, selectedMasterId, schedules, services]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const toggleService = (sid: string) => {
    setServiceIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const saved = await bookingService.saveMaster({
        id: selectedMaster?.id,
        name_ru: nameRu,
        name_en: nameEn || nameRu,
        role_ru: roleRu,
        role_en: roleEn || roleRu,
        bio_ru: bioRu,
        bio_en: bioEn || bioRu,
        avatar_url: avatarUrl,
        experience_years: Number(experienceYears),
        rating: Number(rating),
        is_active: isActive,
        sort_order: selectedMaster?.sort_order ?? masters.length + 1,
        service_ids: serviceIds,
      });
      await onRefresh();
      setSelectedMasterId(saved.id);
      showToast(t.admin.mastersAdmin.savedToast);
    } finally {
      setSavingProfile(false);
    }
  };

  const updateDaySchedule = (
    dow: number,
    patch: Partial<MasterSchedule>
  ) => {
    setDraftSchedules((prev) =>
      prev.map((row) => (row.day_of_week === dow ? { ...row, ...patch } : row))
    );
  };

  const handleSaveSchedule = async () => {
    if (!selectedMaster) return;
    setSavingSchedule(true);
    try {
      await bookingService.saveMasterSchedules(selectedMaster.id, draftSchedules);
      await onRefresh();
      showToast(t.admin.mastersAdmin.savedToast);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddTimeOff = async () => {
    if (!selectedMaster || !offDate) return;
    await bookingService.addMasterTimeOff(selectedMaster.id, offDate, offReason);
    setOffReason('');
    await onRefresh();
  };

  const handleRemoveTimeOff = async (id: string) => {
    await bookingService.removeMasterTimeOff(id);
    await onRefresh();
  };

  const masterTimeOffs = selectedMaster
    ? timeOffs.filter((o) => o.master_id === selectedMaster.id)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Sidebar: Masters list */}
      <div className="space-y-3 lg:col-span-4">
        <button
          type="button"
          onClick={() => setSelectedMasterId('new')}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-xs font-medium transition-colors ${
            selectedMasterId === 'new'
              ? 'border-[#8C5E3C] bg-[#8C5E3C]/10 text-[#8C5E3C]'
              : 'border-[#E8E5DF] bg-white text-[#1C1B18] hover:border-[#8C5E3C]'
          }`}
        >
          <Plus className="h-4 w-4" />
          {t.admin.mastersAdmin.addMaster}
        </button>

        {masters.map((m) => {
          const active = m.id === selectedMasterId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMasterId(m.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                active
                  ? 'border-[#8C5E3C] bg-white ring-1 ring-[#8C5E3C]'
                  : 'border-[#E8E5DF] bg-white hover:border-[#8C5E3C]/50'
              }`}
            >
              <img
                src={m.avatar_url || '/images/master-1.jpg'}
                alt={lang === 'ru' ? m.name_ru : m.name_en}
                className="h-12 w-12 rounded-full border border-[#E8E5DF] object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[#1C1B18]">
                    {lang === 'ru' ? m.name_ru : m.name_en}
                  </span>
                  {!m.is_active && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-[#6B6860]">
                  {lang === 'ru' ? m.role_ru : m.role_en}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Column: Profile + Schedule + Time Off */}
      <div className="space-y-6 lg:col-span-8">
        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
            <UserCheck className="h-4 w-4" />
            {toast}
          </div>
        )}

        {/* Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-[#E8E5DF] bg-white p-6"
        >
          <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-4">
            <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
              {selectedMaster
                ? t.admin.mastersAdmin.editMaster
                : t.admin.mastersAdmin.addMaster}
            </h3>
            <label className="flex items-center gap-2 text-xs font-medium text-[#1C1B18]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded accent-[#8C5E3C]"
              />
              {t.admin.mastersAdmin.activeLabel}
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                Имя (RU) *
              </label>
              <input
                type="text"
                required
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                Name (EN)
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                Специализация (RU) *
              </label>
              <input
                type="text"
                required
                value={roleRu}
                onChange={(e) => setRoleRu(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                Role (EN)
              </label>
              <input
                type="text"
                value={roleEn}
                onChange={(e) => setRoleEn(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                Фото URL
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                  {t.mastersSection.experience} ({t.mastersSection.years})
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm tabular-nums outline-none focus:border-[#8C5E3C] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                  Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm tabular-nums outline-none focus:border-[#8C5E3C] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                О мастере (RU)
              </label>
              <textarea
                rows={2}
                value={bioRu}
                onChange={(e) => setBioRu(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                Bio (EN)
              </label>
              <textarea
                rows={2}
                value={bioEn}
                onChange={(e) => setBioEn(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
          </div>

          {/* Assigned Services */}
          <div className="mt-5">
            <div className="mb-2 text-xs font-medium text-[#1C1B18]">
              {t.admin.mastersAdmin.servicesProvided}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((srv) => (
                <label
                  key={srv.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-2 text-xs hover:border-[#8C5E3C]/60"
                >
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(srv.id)}
                    onChange={() => toggleService(srv.id)}
                    className="h-4 w-4 rounded accent-[#8C5E3C]"
                  />
                  <span className="text-[#1C1B18]">
                    {lang === 'ru' ? srv.name_ru : srv.name_en}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B18] px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#8C5E3C] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {t.admin.actions.save}
            </button>
          </div>
        </form>

        {/* Weekly Schedule & Time Off (only for saved masters) */}
        {selectedMaster && (
          <>
            <div className="rounded-2xl border border-[#E8E5DF] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
                <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
                  {t.admin.mastersAdmin.scheduleTitle}
                </h3>
                <button
                  type="button"
                  disabled={savingSchedule}
                  onClick={handleSaveSchedule}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#8C5E3C] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#734B2E] disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {t.admin.mastersAdmin.saveSchedule}
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {draftSchedules.map((sched) => (
                  <div
                    key={sched.day_of_week}
                    className="flex flex-col gap-3 rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={sched.is_working}
                        onChange={(e) =>
                          updateDaySchedule(sched.day_of_week, {
                            is_working: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded accent-[#8C5E3C]"
                      />
                      <span className="w-28 text-xs font-medium text-[#1C1B18]">
                        {WEEKDAY_FULL[lang][sched.day_of_week]}
                      </span>
                    </div>

                    {sched.is_working ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={sched.start_time}
                          onChange={(e) =>
                            updateDaySchedule(sched.day_of_week, {
                              start_time: e.target.value,
                            })
                          }
                          className="rounded-lg border border-[#E8E5DF] bg-white px-2 py-1 tabular-nums"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={sched.end_time}
                          onChange={(e) =>
                            updateDaySchedule(sched.day_of_week, {
                              end_time: e.target.value,
                            })
                          }
                          className="rounded-lg border border-[#E8E5DF] bg-white px-2 py-1 tabular-nums"
                        />

                        <span className="ml-2 text-[#6B6860]">
                          {t.admin.mastersAdmin.breakLabel}:
                        </span>
                        <input
                          type="time"
                          value={sched.break_start ?? ''}
                          onChange={(e) =>
                            updateDaySchedule(sched.day_of_week, {
                              break_start: e.target.value || null,
                            })
                          }
                          className="rounded-lg border border-[#E8E5DF] bg-white px-2 py-1 tabular-nums"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={sched.break_end ?? ''}
                          onChange={(e) =>
                            updateDaySchedule(sched.day_of_week, {
                              break_end: e.target.value || null,
                            })
                          }
                          className="rounded-lg border border-[#E8E5DF] bg-white px-2 py-1 tabular-nums"
                        />
                      </div>
                    ) : (
                      <span className="text-xs italic text-[#6B6860]">
                        {t.admin.mastersAdmin.off}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Specific Days Off */}
            <div className="rounded-2xl border border-[#E8E5DF] bg-white p-6">
              <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-4">
                <CalendarOff className="h-5 w-5 text-[#8C5E3C]" />
                <h3 className="font-serif text-2xl font-medium text-[#1C1B18]">
                  {t.admin.mastersAdmin.timeOffTitle}
                </h3>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  type="date"
                  value={offDate}
                  onChange={(e) => setOffDate(e.target.value)}
                  className="rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={offReason}
                  onChange={(e) => setOffReason(e.target.value)}
                  placeholder="Reason / Причина"
                  className="flex-1 rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTimeOff}
                  className="rounded-full bg-[#1C1B18] px-4 py-2 text-xs font-medium text-white hover:bg-[#8C5E3C]"
                >
                  {t.admin.mastersAdmin.addTimeOff}
                </button>
              </div>

              {masterTimeOffs.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {masterTimeOffs.map((off) => (
                    <div
                      key={off.id}
                      className="inline-flex items-center gap-2 rounded-full border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-1 text-xs"
                    >
                      <span className="font-medium tabular-nums">{off.off_date}</span>
                      {off.reason && (
                        <span className="text-[#6B6860]">· {off.reason}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeOff(off.id)}
                        className="text-rose-700 hover:text-rose-900"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

