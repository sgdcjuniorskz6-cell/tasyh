import { Database, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { bookingService } from '../../services/bookingService';
import type { SalonSettings } from '../../types/booking';

export function SettingsTab({
  settings,
  mode,
  onRefresh,
}: {
  settings: SalonSettings;
  mode: 'supabase' | 'demo';
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<SalonSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bookingService.saveSalonSettings(form);
      await onRefresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-[#E8E5DF] bg-white p-6 lg:col-span-2"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.salonName}
            </label>
            <input
              type="text"
              required
              value={form.salon_name}
              onChange={(e) => setForm({ ...form, salon_name: e.target.value })}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.phone}
            </label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.email}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.currency}
            </label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
            >
              <option value="₸">₸ (KZT)</option>
              <option value="₽">₽ (RUB)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.addressRu}
            </label>
            <input
              type="text"
              value={form.address_ru}
              onChange={(e) => setForm({ ...form, address_ru: e.target.value })}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.addressEn}
            </label>
            <input
              type="text"
              value={form.address_en}
              onChange={(e) => setForm({ ...form, address_en: e.target.value })}
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.slotInterval}
            </label>
            <select
              value={form.slot_interval_minutes}
              onChange={(e) =>
                setForm({ ...form, slot_interval_minutes: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
            >
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              {t.admin.settingsAdmin.horizon}
            </label>
            <input
              type="number"
              min={7}
              max={60}
              value={form.booking_horizon_days}
              onChange={(e) =>
                setForm({ ...form, booking_horizon_days: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm tabular-nums"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs font-medium text-emerald-700">
              {t.admin.mastersAdmin.savedToast}
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B18] px-5 py-2 text-xs font-medium text-white hover:bg-[#8C5E3C] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {t.admin.settingsAdmin.saveSettings}
          </button>
        </div>
      </form>

      {/* Integration Status Card */}
      <div className="rounded-2xl border border-[#E8E5DF] bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-[#1C1B18]">
          <Database className="h-4 w-4 text-[#8C5E3C]" />
          <span>Supabase & Cloudflare</span>
        </div>
        <div className="mt-3">
          {mode === 'supabase' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t.admin.liveConnected}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Demo Mode (localStorage)
            </span>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#6B6860]">
          {mode === 'supabase'
            ? 'VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY active. RLS & advisory booking locks enabled.'
            : t.admin.demoBanner}
        </p>
      </div>
    </div>
  );
}

