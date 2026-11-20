import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Save,
  Send,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { bookingService } from '../../services/bookingService';
import type { SalonSettings, TelegramSettings } from '../../types/booking';

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

  // Telegram settings state
  const [telegram, setTelegram] = useState<TelegramSettings>({
    id: 1,
    bot_token: '',
    chat_id: '',
    is_enabled: false,
    send_on_new: true,
    send_on_cancel: true,
  });
  const [savingTg, setSavingTg] = useState(false);
  const [savedTg, setSavedTg] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [testTgSuccess, setTestTgSuccess] = useState<string | null>(null);
  const [testTgError, setTestTgError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let isMounted = true;
    bookingService.getTelegramSettings().then((res) => {
      if (isMounted) {
        setTelegram(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleSaveTelegram = async (e: FormEvent) => {
    e.preventDefault();
    setSavingTg(true);
    setTestTgSuccess(null);
    setTestTgError(null);
    try {
      const updated = await bookingService.saveTelegramSettings(telegram);
      setTelegram(updated);
      setSavedTg(true);
      setTimeout(() => setSavedTg(false), 2500);
    } catch (err) {
      setTestTgError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSavingTg(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegram.bot_token?.trim() || !telegram.chat_id?.trim()) {
      setTestTgError('Сначала укажите Bot Token и Chat ID');
      return;
    }
    setTestingTg(true);
    setTestTgSuccess(null);
    setTestTgError(null);
    try {
      await bookingService.testTelegramNotification(telegram.bot_token, telegram.chat_id);
      setTestTgSuccess(t.admin.settingsAdmin.telegramTestSuccess);
    } catch (err) {
      setTestTgError(err instanceof Error ? err.message : 'Не удалось отправить сообщение в Telegram');
    } finally {
      setTestingTg(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Salon Info Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-[#E8E5DF] bg-white p-6 lg:col-span-2 shadow-sm"
        >
          <div className="border-b border-[#E8E5DF] pb-3">
            <h2 className="font-serif text-lg font-medium text-[#1C1B18]">
              {t.admin.tabs.settings}
            </h2>
            <p className="text-xs text-[#6B6860]">
              Основные параметры салона, отображаемые на сайте и в чеках бронирования
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B18] px-5 py-2 text-xs font-medium text-white hover:bg-[#8C5E3C] disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              {t.admin.settingsAdmin.saveSettings}
            </button>
          </div>
        </form>

        {/* Integration Status Card */}
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-6 shadow-sm">
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
              ? 'База данных Supabase активна. Триггеры уведомлений и защита RLS включены.'
              : t.admin.demoBanner}
          </p>
        </div>
      </div>

      {/* Telegram Notifications Section */}
      <div className="rounded-2xl border border-[#E8E5DF] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8E5DF] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ED9]/10 text-[#229ED9]">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-[#1C1B18]">
                {t.admin.settingsAdmin.telegramTitle}
              </h2>
              <p className="text-xs text-[#6B6860]">
                {t.admin.settingsAdmin.telegramSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#229ED9] hover:underline self-start sm:self-auto"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {showGuide ? 'Скрыть инструкцию' : 'Инструкция по настройке'}
          </button>
        </div>

        {/* Step-by-step Guide */}
        {showGuide && (
          <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-950">
            <div className="font-semibold text-sky-900 mb-2">
              {t.admin.settingsAdmin.telegramInstructionsTitle}
            </div>
            <ol className="list-decimal space-y-1.5 pl-4 text-sky-900/90 leading-relaxed">
              <li>
                {t.admin.settingsAdmin.telegramStep1}{' '}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium underline hover:text-sky-700"
                >
                  @BotFather <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>{t.admin.settingsAdmin.telegramStep2}</li>
              <li>{t.admin.settingsAdmin.telegramStep3}</li>
              <li>
                {t.admin.settingsAdmin.telegramStep4}{' '}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium underline hover:text-sky-700"
                >
                  @userinfobot <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ol>
          </div>
        )}

        {/* Telegram Form */}
        <form onSubmit={handleSaveTelegram} className="mt-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={telegram.is_enabled}
              onChange={(e) =>
                setTelegram({ ...telegram, is_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-[#1C1B18] focus:ring-[#8C5E3C]"
            />
            <span className="text-sm font-medium text-[#1C1B18]">
              {t.admin.settingsAdmin.telegramEnabled}
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.admin.settingsAdmin.telegramBotToken}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={telegram.bot_token ?? ''}
                  placeholder={t.admin.settingsAdmin.telegramBotTokenPlaceholder}
                  onChange={(e) =>
                    setTelegram({ ...telegram, bot_token: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 pr-10 text-xs font-mono outline-none focus:border-[#8C5E3C] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-2.5 flex items-center text-[#6B6860] hover:text-[#1C1B18]"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C1B18]">
                {t.admin.settingsAdmin.telegramChatId}
              </label>
              <input
                type="text"
                value={telegram.chat_id ?? ''}
                placeholder={t.admin.settingsAdmin.telegramChatIdPlaceholder}
                onChange={(e) =>
                  setTelegram({ ...telegram, chat_id: e.target.value })
                }
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-xs font-mono outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>
          </div>

          {/* Feedback Alerts */}
          {testTgSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{testTgSuccess}</span>
            </div>
          )}

          {testTgError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{testTgError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8E5DF]">
            <button
              type="button"
              disabled={testingTg || !telegram.bot_token || !telegram.chat_id}
              onClick={handleTestTelegram}
              className="inline-flex items-center gap-2 rounded-full border border-[#229ED9] bg-white px-4 py-2 text-xs font-medium text-[#229ED9] hover:bg-sky-50 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3 w-3" />
              {testingTg ? t.admin.settingsAdmin.telegramTesting : t.admin.settingsAdmin.telegramTestBtn}
            </button>

            <div className="flex items-center gap-3">
              {savedTg && (
                <span className="text-xs font-medium text-emerald-700">
                  {t.admin.settingsAdmin.telegramSaveToast}
                </span>
              )}
              <button
                type="submit"
                disabled={savingTg}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B18] px-5 py-2 text-xs font-medium text-white hover:bg-[#8C5E3C] disabled:opacity-50 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Сохранить Telegram
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
