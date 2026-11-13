import { CalendarCheck, LogOut, RefreshCw, Scissors, Settings, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AppointmentsTab } from '../components/admin/AppointmentsTab';
import { MastersTab } from '../components/admin/MastersTab';
import { ServicesTab } from '../components/admin/ServicesTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { useLanguage } from '../context/LanguageContext';
import { bookingService, type CatalogData, type SessionStatus } from '../services/bookingService';
import type { Appointment } from '../types/booking';

type AdminTab = 'appointments' | 'masters' | 'services' | 'settings';

export function AdminPage({ onCatalogUpdated }: { onCatalogUpdated: () => Promise<void> }) {
  const { t } = useLanguage();

  const [session, setSession] = useState<SessionStatus | null>(null);
  const [tab, setTab] = useState<AdminTab>('appointments');
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, appts] = await Promise.all([
        bookingService.getCatalog(true),
        bookingService.getAdminAppointments(),
      ]);
      setCatalog(cat);
      setAppointments(appts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bookingService.getSessionStatus().then((status) => {
      setSession(status);
      if (status.isAuthenticated && status.isAdmin) {
        loadAll();
      } else {
        setLoading(false);
      }
    });
  }, [loadAll]);

  const handleRefresh = async () => {
    await Promise.all([loadAll(), onCatalogUpdated()]);
  };

  const handleSignOut = async () => {
    await bookingService.signOutAdmin();
    const fresh = await bookingService.getSessionStatus();
    setSession(fresh);
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-[#6B6860]">
        Loading…
      </div>
    );
  }

  if (!session.isAuthenticated || !session.isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#FAF9F6] px-4">
        <AdminLogin
          mode={session.mode}
          onSuccess={(next) => {
            setSession(next);
            loadAll();
          }}
        />
      </div>
    );
  }

  const tabsMeta = [
    { id: 'appointments' as const, label: t.admin.tabs.appointments, icon: CalendarCheck },
    { id: 'masters' as const, label: t.admin.tabs.masters, icon: Users },
    { id: 'services' as const, label: t.admin.tabs.services, icon: Scissors },
    { id: 'settings' as const, label: t.admin.tabs.settings, icon: Settings },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF9F6] pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {session.mode === 'demo' && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900">
            {t.admin.demoBanner}
          </div>
        )}

        {/* Top Bar */}
        <div className="flex flex-col gap-4 border-b border-[#E8E5DF] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium text-[#1C1B18]">
              {t.admin.title}
            </h1>
            {session.email && (
              <p className="mt-0.5 text-xs text-[#6B6860]">{session.email}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E5DF] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1C1B18] hover:border-[#8C5E3C]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E5DF] bg-white px-3.5 py-1.5 text-xs font-medium text-[#6B6860] hover:border-rose-300 hover:text-rose-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t.admin.signOut}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          {tabsMeta.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#1C1B18] text-white'
                    : 'border border-[#E8E5DF] bg-white text-[#6B6860] hover:text-[#1C1B18]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panel */}
        <div className="mt-6">
          {!catalog ? (
            <div className="rounded-2xl border border-[#E8E5DF] bg-white p-10 text-center text-sm text-[#6B6860]">
              Loading…
            </div>
          ) : (
            <>
              {tab === 'appointments' && (
                <AppointmentsTab
                  appointments={appointments}
                  services={catalog.services}
                  masters={catalog.masters}
                  schedules={catalog.schedules}
                  timeOffs={catalog.timeOffs}
                  settings={catalog.settings}
                  onRefresh={handleRefresh}
                />
              )}
              {tab === 'masters' && (
                <MastersTab
                  masters={catalog.masters}
                  services={catalog.services}
                  schedules={catalog.schedules}
                  timeOffs={catalog.timeOffs}
                  onRefresh={handleRefresh}
                />
              )}
              {tab === 'services' && (
                <ServicesTab
                  services={catalog.services}
                  settings={catalog.settings}
                  onRefresh={handleRefresh}
                />
              )}
              {tab === 'settings' && (
                <SettingsTab
                  settings={catalog.settings}
                  mode={session.mode}
                  onRefresh={handleRefresh}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

