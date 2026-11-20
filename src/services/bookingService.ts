import { createInitialDemoStore, type DemoStore } from '../data/demoData';
import {
  isActiveBookingStatus,
  minutesToTime,
  normalizeTime,
  parseLocalDate,
  parseTimeToMinutes,
} from '../lib/slots';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  AdminBookingInput,
  Appointment,
  AppointmentStatus,
  BookingConfirmation,
  Master,
  MasterSchedule,
  MasterTimeOff,
  PublicBookingInput,
  SalonSettings,
  Service,
  TelegramSettings,
  TimeInterval,
} from '../types/booking';

const DEMO_STORE_KEY = 'linea_salon_demo_store_v2';
const DEMO_ADMIN_SESSION_KEY = 'linea_salon_demo_admin_auth';

function loadDemoStore(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_STORE_KEY);
    if (raw) {
      return JSON.parse(raw) as DemoStore;
    }
  } catch {
    // ignore corrupted storage
  }
  const initial = createInitialDemoStore();
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(initial));
  return initial;
}

function saveDemoStore(store: DemoStore): void {
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
}

function generateBookingCode(): string {
  return 'LN-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

export interface CatalogData {
  settings: SalonSettings;
  services: Service[];
  masters: Master[];
  schedules: MasterSchedule[];
  timeOffs: MasterTimeOff[];
}

export interface SessionStatus {
  mode: 'supabase' | 'demo';
  isAuthenticated: boolean;
  isAdmin: boolean;
  email: string | null;
}

export const bookingService = {
  getMode(): 'supabase' | 'demo' {
    return isSupabaseConfigured ? 'supabase' : 'demo';
  },

  async getCatalog(includeInactive = false): Promise<CatalogData> {
    if (!supabase) {
      const store = loadDemoStore();
      return {
        settings: store.settings,
        services: includeInactive
          ? store.services
          : store.services.filter((s) => s.is_active),
        masters: includeInactive
          ? store.masters
          : store.masters.filter((m) => m.is_active),
        schedules: store.schedules,
        timeOffs: store.timeOffs,
      };
    }

    const [settingsRes, servicesRes, mastersRes, msRes, schedRes, offRes] =
      await Promise.all([
        supabase.from('salon_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('services').select('*').order('sort_order', { ascending: true }),
        supabase.from('masters').select('*').order('sort_order', { ascending: true }),
        supabase.from('master_services').select('master_id, service_id'),
        supabase.from('master_schedules').select('*').order('day_of_week', { ascending: true }),
        supabase.from('master_time_offs').select('*').order('off_date', { ascending: true }),
      ]);

    if (servicesRes.error) throw servicesRes.error;
    if (mastersRes.error) throw mastersRes.error;
    if (msRes.error) throw msRes.error;
    if (schedRes.error) throw schedRes.error;
    if (offRes.error) throw offRes.error;

    const serviceMap = new Map<string, string[]>();
    for (const row of msRes.data ?? []) {
      const list = serviceMap.get(row.master_id) ?? [];
      list.push(row.service_id);
      serviceMap.set(row.master_id, list);
    }

    const services = (servicesRes.data ?? []) as Service[];
    const masters = (mastersRes.data ?? []).map((m) => ({
      ...(m as Omit<Master, 'service_ids'>),
      rating: Number(m.rating),
      service_ids: serviceMap.get(m.id) ?? [],
    }));

    const schedules = (schedRes.data ?? []).map((s) => ({
      ...(s as MasterSchedule),
      start_time: normalizeTime(s.start_time),
      end_time: normalizeTime(s.end_time),
      break_start: s.break_start ? normalizeTime(s.break_start) : null,
      break_end: s.break_end ? normalizeTime(s.break_end) : null,
    }));

    const fallbackSettings = createInitialDemoStore().settings;

    return {
      settings: (settingsRes.data as SalonSettings | null) ?? fallbackSettings,
      services: includeInactive ? services : services.filter((s) => s.is_active),
      masters: includeInactive ? masters : masters.filter((m) => m.is_active),
      schedules,
      timeOffs: (offRes.data ?? []) as MasterTimeOff[],
    };
  },

  async getBusyIntervals(masterId: string, dateStr: string): Promise<TimeInterval[]> {
    if (!supabase) {
      const store = loadDemoStore();
      return store.appointments
        .filter(
          (a) =>
            a.master_id === masterId &&
            a.appointment_date === dateStr &&
            isActiveBookingStatus(a.status)
        )
        .map((a) => ({
          start_time: normalizeTime(a.start_time),
          end_time: normalizeTime(a.end_time),
        }));
    }

    const { data, error } = await supabase.rpc('get_busy_intervals', {
      p_master_id: masterId,
      p_date: dateStr,
    });

    if (error) throw error;
    return ((data ?? []) as TimeInterval[]).map((row) => ({
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    }));
  },

  async createPublicBooking(input: PublicBookingInput): Promise<BookingConfirmation> {
    if (!supabase) {
      const store = loadDemoStore();
      const service = store.services.find((s) => s.id === input.service_id && s.is_active);
      if (!service) throw new Error('Service is not available');

      const master = store.masters.find((m) => m.id === input.master_id && m.is_active);
      if (!master) throw new Error('Stylist is not available');

      if (!master.service_ids.includes(service.id)) {
        throw new Error('Selected stylist does not perform this service');
      }

      if (
        store.timeOffs.some(
          (t) => t.master_id === master.id && t.off_date === input.appointment_date
        )
      ) {
        throw new Error('Stylist is unavailable on this date');
      }

      const dow = parseLocalDate(input.appointment_date).getDay();
      const schedule = store.schedules.find(
        (s) => s.master_id === master.id && s.day_of_week === dow
      );
      if (!schedule || !schedule.is_working) {
        throw new Error('Stylist does not work on this weekday');
      }

      const startMins = parseTimeToMinutes(input.start_time);
      const endMins = startMins + service.duration_minutes;
      const workStart = parseTimeToMinutes(schedule.start_time);
      const workEnd = parseTimeToMinutes(schedule.end_time);

      if (startMins < workStart || endMins > workEnd) {
        throw new Error('Selected time is outside working hours');
      }

      if (schedule.break_start && schedule.break_end) {
        const bStart = parseTimeToMinutes(schedule.break_start);
        const bEnd = parseTimeToMinutes(schedule.break_end);
        if (startMins < bEnd && endMins > bStart) {
          throw new Error('Selected time overlaps stylist break');
        }
      }

      const hasOverlap = store.appointments.some((a) => {
        if (
          a.master_id !== master.id ||
          a.appointment_date !== input.appointment_date ||
          !isActiveBookingStatus(a.status)
        ) {
          return false;
        }
        const aStart = parseTimeToMinutes(a.start_time);
        const aEnd = parseTimeToMinutes(a.end_time);
        return startMins < aEnd && endMins > aStart;
      });

      if (hasOverlap) {
        throw new Error('Selected time slot is already booked');
      }

      const created: Appointment = {
        id: crypto.randomUUID(),
        booking_code: generateBookingCode(),
        master_id: master.id,
        service_id: service.id,
        appointment_date: input.appointment_date,
        start_time: normalizeTime(input.start_time),
        end_time: minutesToTime(endMins),
        duration_minutes: service.duration_minutes,
        price: service.price,
        client_name: input.client_name.trim(),
        client_phone: input.client_phone.trim(),
        client_email: input.client_email?.trim() || null,
        notes: input.notes?.trim() || null,
        status: 'pending',
        created_by: 'client',
        created_at: new Date().toISOString(),
      };

      store.appointments.unshift(created);
      saveDemoStore(store);

      return {
        id: created.id,
        booking_code: created.booking_code,
        master_id: created.master_id,
        service_id: created.service_id,
        appointment_date: created.appointment_date,
        start_time: created.start_time,
        end_time: created.end_time,
        duration_minutes: created.duration_minutes,
        price: created.price,
        client_name: created.client_name,
        client_phone: created.client_phone,
        status: created.status,
      };
    }

    const { data, error } = await supabase.rpc('create_public_booking', {
      p_master_id: input.master_id,
      p_service_id: input.service_id,
      p_date: input.appointment_date,
      p_start_time: input.start_time,
      p_client_name: input.client_name,
      p_client_phone: input.client_phone,
      p_client_email: input.client_email || null,
      p_notes: input.notes || null,
    });

    if (error) throw error;
    return data as BookingConfirmation;
  },

  async getSessionStatus(): Promise<SessionStatus> {
    if (!supabase) {
      const authed = sessionStorage.getItem(DEMO_ADMIN_SESSION_KEY) === 'true';
      return {
        mode: 'demo',
        isAuthenticated: authed,
        isAdmin: authed,
        email: authed ? 'demo-admin@linea-studio.local' : null,
      };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      return {
        mode: 'supabase',
        isAuthenticated: false,
        isAdmin: false,
        email: null,
      };
    }

    const { data: isAdmin, error } = await supabase.rpc('is_admin');
    return {
      mode: 'supabase',
      isAuthenticated: true,
      isAdmin: !error && Boolean(isAdmin),
      email: user.email ?? null,
    };
  },

  async signInAdmin(email: string, password: string): Promise<SessionStatus> {
    if (!supabase) {
      sessionStorage.setItem(DEMO_ADMIN_SESSION_KEY, 'true');
      return {
        mode: 'demo',
        isAuthenticated: true,
        isAdmin: true,
        email: 'demo-admin@linea-studio.local',
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;

    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_admin');
    if (adminErr || !isAdmin) {
      await supabase.auth.signOut();
      throw new Error('NOT_ADMIN');
    }

    return {
      mode: 'supabase',
      isAuthenticated: true,
      isAdmin: true,
      email: data.user?.email ?? email,
    };
  },

  async signOutAdmin(): Promise<void> {
    if (!supabase) {
      sessionStorage.removeItem(DEMO_ADMIN_SESSION_KEY);
      return;
    }
    await supabase.auth.signOut();
  },

  async getAdminAppointments(): Promise<Appointment[]> {
    if (!supabase) {
      const store = loadDemoStore();
      return [...store.appointments].sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) {
          return b.appointment_date.localeCompare(a.appointment_date);
        }
        return a.start_time.localeCompare(b.start_time);
      });
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Appointment[]).map((a) => ({
      ...a,
      start_time: normalizeTime(a.start_time),
      end_time: normalizeTime(a.end_time),
    }));
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
    if (!supabase) {
      const store = loadDemoStore();
      const target = store.appointments.find((a) => a.id === id);
      if (target) {
        target.status = status;
        saveDemoStore(store);
      }
      return;
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteAppointment(id: string): Promise<void> {
    if (!supabase) {
      const store = loadDemoStore();
      store.appointments = store.appointments.filter((a) => a.id !== id);
      saveDemoStore(store);
      return;
    }

    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  },

  async createAdminBooking(input: AdminBookingInput): Promise<Appointment> {
    if (!supabase) {
      const store = loadDemoStore();
      const service = store.services.find((s) => s.id === input.service_id);
      if (!service) throw new Error('Service not found');

      const startMins = parseTimeToMinutes(input.start_time);
      const endMins = startMins + service.duration_minutes;

      if (!input.allow_overlap) {
        const hasOverlap = store.appointments.some((a) => {
          if (
            a.master_id !== input.master_id ||
            a.appointment_date !== input.appointment_date ||
            !isActiveBookingStatus(a.status)
          ) {
            return false;
          }
          const aStart = parseTimeToMinutes(a.start_time);
          const aEnd = parseTimeToMinutes(a.end_time);
          return startMins < aEnd && endMins > aStart;
        });
        if (hasOverlap) {
          throw new Error('Selected time slot overlaps an existing booking');
        }
      }

      const created: Appointment = {
        id: crypto.randomUUID(),
        booking_code: generateBookingCode(),
        master_id: input.master_id,
        service_id: service.id,
        appointment_date: input.appointment_date,
        start_time: normalizeTime(input.start_time),
        end_time: minutesToTime(endMins),
        duration_minutes: service.duration_minutes,
        price: service.price,
        client_name: input.client_name.trim(),
        client_phone: input.client_phone.trim(),
        client_email: input.client_email?.trim() || null,
        notes: input.notes?.trim() || null,
        status: input.status,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };

      store.appointments.unshift(created);
      saveDemoStore(store);
      return created;
    }

    const { data, error } = await supabase.rpc('create_admin_booking', {
      p_master_id: input.master_id,
      p_service_id: input.service_id,
      p_date: input.appointment_date,
      p_start_time: input.start_time,
      p_client_name: input.client_name,
      p_client_phone: input.client_phone,
      p_client_email: input.client_email || null,
      p_notes: input.notes || null,
      p_status: input.status,
      p_allow_overlap: Boolean(input.allow_overlap),
    });

    if (error) throw error;
    const row = data as Appointment;
    return {
      ...row,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    };
  },

  async saveService(service: Omit<Service, 'id'> & { id?: string }): Promise<Service> {
    if (!supabase) {
      const store = loadDemoStore();
      if (service.id) {
        const idx = store.services.findIndex((s) => s.id === service.id);
        const updated: Service = { ...(service as Service) };
        if (idx >= 0) store.services[idx] = updated;
        saveDemoStore(store);
        return updated;
      }
      const created: Service = {
        ...(service as Omit<Service, 'id'>),
        id: crypto.randomUUID(),
      };
      store.services.push(created);
      saveDemoStore(store);
      return created;
    }

    if (service.id) {
      const { id, ...rest } = service;
      const { data, error } = await supabase
        .from('services')
        .update(rest)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as Service;
    }

    const { id: _ignored, ...rest } = service;
    const { data, error } = await supabase
      .from('services')
      .insert(rest)
      .select('*')
      .single();
    if (error) throw error;
    return data as Service;
  },

  async deleteService(id: string): Promise<void> {
    if (!supabase) {
      const store = loadDemoStore();
      store.services = store.services.filter((s) => s.id !== id);
      saveDemoStore(store);
      return;
    }
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  },

  async saveMaster(
    master: Omit<Master, 'id'> & { id?: string }
  ): Promise<Master> {
    const { service_ids, ...masterFields } = master;

    if (!supabase) {
      const store = loadDemoStore();
      if (master.id) {
        const idx = store.masters.findIndex((m) => m.id === master.id);
        const updated: Master = { ...(master as Master) };
        if (idx >= 0) store.masters[idx] = updated;
        saveDemoStore(store);
        return updated;
      }
      const newId = crypto.randomUUID();
      const created: Master = {
        ...(masterFields as Omit<Master, 'id' | 'service_ids'>),
        id: newId,
        service_ids,
      };
      store.masters.push(created);
      // Create default 7-day schedules for newly added master
      for (let dow = 0; dow <= 6; dow++) {
        store.schedules.push({
          id: `sched-${newId}-${dow}`,
          master_id: newId,
          day_of_week: dow,
          is_working: dow !== 0,
          start_time: '10:00',
          end_time: '20:00',
          break_start: '14:00',
          break_end: '15:00',
        });
      }
      saveDemoStore(store);
      return created;
    }

    let savedId = master.id;
    let savedRow: Omit<Master, 'service_ids'>;

    if (savedId) {
      const { id: _id, ...rest } = masterFields;
      const { data, error } = await supabase
        .from('masters')
        .update(rest)
        .eq('id', savedId)
        .select('*')
        .single();
      if (error) throw error;
      savedRow = data as Omit<Master, 'service_ids'>;
    } else {
      const { id: _id, ...rest } = masterFields;
      const { data, error } = await supabase
        .from('masters')
        .insert(rest)
        .select('*')
        .single();
      if (error) throw error;
      savedRow = data as Omit<Master, 'service_ids'>;
      savedId = savedRow.id;

      // Seed default weekly schedule in DB for new master
      const defaultScheds = Array.from({ length: 7 }, (_, dow) => ({
        master_id: savedId,
        day_of_week: dow,
        is_working: dow !== 0,
        start_time: '10:00',
        end_time: '20:00',
        break_start: '14:00',
        break_end: '15:00',
      }));
      const { error: schedErr } = await supabase
        .from('master_schedules')
        .insert(defaultScheds);
      if (schedErr) throw schedErr;
    }

    // Sync master_services
    const { error: delErr } = await supabase
      .from('master_services')
      .delete()
      .eq('master_id', savedId);
    if (delErr) throw delErr;

    if (service_ids.length > 0) {
      const { error: insErr } = await supabase.from('master_services').insert(
        service_ids.map((sid) => ({ master_id: savedId, service_id: sid }))
      );
      if (insErr) throw insErr;
    }

    return {
      ...savedRow,
      rating: Number(savedRow.rating),
      service_ids,
    };
  },

  async saveMasterSchedules(
    masterId: string,
    schedules: MasterSchedule[]
  ): Promise<void> {
    if (!supabase) {
      const store = loadDemoStore();
      store.schedules = store.schedules.filter((s) => s.master_id !== masterId);
      store.schedules.push(...schedules);
      saveDemoStore(store);
      return;
    }

    const payload = schedules.map((s) => ({
      master_id: masterId,
      day_of_week: s.day_of_week,
      is_working: s.is_working,
      start_time: s.start_time,
      end_time: s.end_time,
      break_start: s.break_start || null,
      break_end: s.break_end || null,
    }));

    const { error } = await supabase
      .from('master_schedules')
      .upsert(payload, { onConflict: 'master_id,day_of_week' });
    if (error) throw error;
  },

  async addMasterTimeOff(
    masterId: string,
    offDate: string,
    reason: string
  ): Promise<MasterTimeOff> {
    if (!supabase) {
      const store = loadDemoStore();
      const created: MasterTimeOff = {
        id: crypto.randomUUID(),
        master_id: masterId,
        off_date: offDate,
        reason,
      };
      store.timeOffs = store.timeOffs.filter(
        (t) => !(t.master_id === masterId && t.off_date === offDate)
      );
      store.timeOffs.push(created);
      saveDemoStore(store);
      return created;
    }

    const { data, error } = await supabase
      .from('master_time_offs')
      .upsert(
        { master_id: masterId, off_date: offDate, reason },
        { onConflict: 'master_id,off_date' }
      )
      .select('*')
      .single();
    if (error) throw error;
    return data as MasterTimeOff;
  },

  async removeMasterTimeOff(id: string): Promise<void> {
    if (!supabase) {
      const store = loadDemoStore();
      store.timeOffs = store.timeOffs.filter((t) => t.id !== id);
      saveDemoStore(store);
      return;
    }
    const { error } = await supabase.from('master_time_offs').delete().eq('id', id);
    if (error) throw error;
  },

  async saveSalonSettings(settings: SalonSettings): Promise<SalonSettings> {
    if (!supabase) {
      const store = loadDemoStore();
      store.settings = settings;
      saveDemoStore(store);
      return settings;
    }

    const { data, error } = await supabase
      .from('salon_settings')
      .upsert({ ...settings, id: 1 })
      .select('*')
      .single();
    if (error) throw error;
    return data as SalonSettings;
  },

  async getTelegramSettings(): Promise<TelegramSettings> {
    const defaultTg: TelegramSettings = {
      id: 1,
      bot_token: null,
      chat_id: null,
      is_enabled: false,
      send_on_new: true,
      send_on_cancel: true,
    };

    if (!supabase) return defaultTg;

    const { data, error } = await supabase
      .from('telegram_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching telegram settings:', error.message);
      return defaultTg;
    }
    return (data as TelegramSettings | null) ?? defaultTg;
  },

  async saveTelegramSettings(settings: Partial<TelegramSettings>): Promise<TelegramSettings> {
    const payload = {
      id: 1,
      bot_token: settings.bot_token ? settings.bot_token.trim() : null,
      chat_id: settings.chat_id ? settings.chat_id.trim() : null,
      is_enabled: Boolean(settings.is_enabled),
      send_on_new: settings.send_on_new ?? true,
      send_on_cancel: settings.send_on_cancel ?? true,
      updated_at: new Date().toISOString(),
    };

    if (!supabase) return payload as TelegramSettings;

    const { data, error } = await supabase
      .from('telegram_settings')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return data as TelegramSettings;
  },

  async testTelegramNotification(botToken: string, chatId: string): Promise<{ success: boolean }> {
    const token = botToken.trim();
    const chat = chatId.trim();
    if (!token || !chat) {
      throw new Error('Укажите токен бота и chat ID для проверки');
    }

    const text =
      '✅ <b>LINEA Hair Studio: Тестовое уведомление</b>\n\n' +
      'Уведомления в Telegram успешно настроены и работают!\n' +
      'Теперь каждая новая запись на сайте будет мгновенно приходить в этот чат.';

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: 'HTML',
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      const desc = body.description || `HTTP ${res.status}`;
      throw new Error(`Ошибка Telegram: ${desc}`);
    }

    return { success: true };
  },
};

