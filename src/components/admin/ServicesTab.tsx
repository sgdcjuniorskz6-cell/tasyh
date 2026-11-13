import { Clock, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatDuration, formatPrice } from '../../lib/slots';
import { bookingService } from '../../services/bookingService';
import type { SalonSettings, Service } from '../../types/booking';

interface ServicesTabProps {
  services: Service[];
  settings: SalonSettings;
  onRefresh: () => Promise<void>;
}

export function ServicesTab({ services, settings, onRefresh }: ServicesTabProps) {
  const { lang, t } = useLanguage();
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setEditing({
      name_ru: '',
      name_en: '',
      category_ru: 'Стрижки',
      category_en: 'Haircuts',
      description_ru: '',
      description_en: '',
      duration_minutes: 45,
      price: 7000,
      is_active: true,
      sort_order: services.length + 1,
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await bookingService.saveService({
        id: editing.id,
        name_ru: editing.name_ru ?? '',
        name_en: editing.name_en || editing.name_ru || '',
        category_ru: editing.category_ru ?? 'Стрижки',
        category_en: editing.category_en || editing.category_ru || 'Haircuts',
        description_ru: editing.description_ru ?? '',
        description_en: editing.description_en || editing.description_ru || '',
        duration_minutes: Number(editing.duration_minutes ?? 45),
        price: Number(editing.price ?? 0),
        is_active: editing.is_active ?? true,
        sort_order: editing.sort_order ?? services.length + 1,
      });
      setEditing(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await bookingService.deleteService(id);
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cannot delete service with existing appointments');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#8C5E3C] px-4 py-2 text-xs font-medium text-white hover:bg-[#734B2E]"
        >
          <Plus className="h-4 w-4" />
          {t.admin.servicesAdmin.addService}
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-[#8C5E3C]/50 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
            <h3 className="font-serif text-xl font-medium text-[#1C1B18]">
              {editing.id
                ? t.admin.servicesAdmin.editService
                : t.admin.servicesAdmin.addService}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-[#6B6860] hover:text-[#1C1B18]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.nameRu} *
              </label>
              <input
                type="text"
                required
                value={editing.name_ru ?? ''}
                onChange={(e) => setEditing({ ...editing, name_ru: e.target.value })}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.nameEn}
              </label>
              <input
                type="text"
                value={editing.name_en ?? ''}
                onChange={(e) => setEditing({ ...editing, name_en: e.target.value })}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.catRu}
              </label>
              <input
                type="text"
                required
                value={editing.category_ru ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, category_ru: e.target.value })
                }
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.catEn}
              </label>
              <input
                type="text"
                value={editing.category_en ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, category_en: e.target.value })
                }
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.duration} *
              </label>
              <input
                type="number"
                min={10}
                step={5}
                required
                value={editing.duration_minutes ?? 45}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    duration_minutes: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.price} ({settings.currency}) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={editing.price ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, price: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.descRu}
              </label>
              <textarea
                rows={2}
                value={editing.description_ru ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, description_ru: e.target.value })
                }
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                {t.admin.servicesAdmin.descEn}
              </label>
              <textarea
                rows={2}
                value={editing.description_en ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, description_en: e.target.value })
                }
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded accent-[#8C5E3C]"
              />
              {t.admin.servicesAdmin.active}
            </label>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B18] px-5 py-2 text-xs font-medium text-white hover:bg-[#8C5E3C]"
            >
              <Save className="h-3.5 w-3.5" />
              {t.admin.actions.save}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((srv) => (
          <div
            key={srv.id}
            className="flex flex-col justify-between rounded-2xl border border-[#E8E5DF] bg-white p-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-wider text-[#8C5E3C] uppercase">
                  {lang === 'ru' ? srv.category_ru : srv.category_en}
                </span>
                <span className="font-semibold text-[#1C1B18] tabular-nums">
                  {formatPrice(srv.price, settings.currency, lang)}
                </span>
              </div>
              <h4 className="mt-1 text-base font-medium text-[#1C1B18]">
                {lang === 'ru' ? srv.name_ru : srv.name_en}
              </h4>
              <p className="mt-1 text-xs text-[#6B6860]">
                {lang === 'ru' ? srv.description_ru : srv.description_en}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#E8E5DF] pt-3 text-xs">
              <span className="inline-flex items-center gap-1 text-[#6B6860] tabular-nums">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(srv.duration_minutes, lang)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(srv)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E8E5DF] px-2.5 py-1 text-[#1C1B18] hover:border-[#8C5E3C]"
                >
                  <Edit2 className="h-3 w-3" />
                  {t.admin.actions.edit}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(srv.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E8E5DF] px-2.5 py-1 text-rose-700 hover:border-rose-300"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

