export type Language = 'ru' | 'en';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface SalonSettings {
  id: number;
  salon_name: string;
  address_ru: string;
  address_en: string;
  phone: string;
  email: string;
  currency: string;
  slot_interval_minutes: number;
  booking_horizon_days: number;
}

export interface Service {
  id: string;
  name_ru: string;
  name_en: string;
  description_ru: string;
  description_en: string;
  category_ru: string;
  category_en: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface Master {
  id: string;
  name_ru: string;
  name_en: string;
  role_ru: string;
  role_en: string;
  bio_ru: string;
  bio_en: string;
  avatar_url: string;
  experience_years: number;
  rating: number;
  is_active: boolean;
  sort_order: number;
  service_ids: string[];
}

export interface MasterSchedule {
  id: string;
  master_id: string;
  day_of_week: number; // 0 = Sun .. 6 = Sat
  is_working: boolean;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  break_start: string | null;
  break_end: string | null;
}

export interface MasterTimeOff {
  id: string;
  master_id: string;
  off_date: string; // YYYY-MM-DD
  reason: string;
}

export interface TimeInterval {
  start_time: string; // HH:MM
  end_time: string; // HH:MM
}

export interface AvailableSlot {
  time: string; // HH:MM
  endTime: string; // HH:MM
  period: 'morning' | 'afternoon' | 'evening';
}

export interface Appointment {
  id: string;
  booking_code: string;
  master_id: string;
  service_id: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_minutes: number;
  price: number;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_by: 'client' | 'admin';
  created_at: string;
}

export interface PublicBookingInput {
  master_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  notes?: string;
}

export interface AdminBookingInput extends PublicBookingInput {
  status: AppointmentStatus;
  allow_overlap?: boolean;
}

export interface BookingConfirmation {
  id: string;
  booking_code: string;
  master_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  price: number;
  client_name: string;
  client_phone: string;
  status: AppointmentStatus;
}

