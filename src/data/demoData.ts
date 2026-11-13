import { addDays, toLocalDateString } from '../lib/slots';
import type {
  Appointment,
  Master,
  MasterSchedule,
  MasterTimeOff,
  SalonSettings,
  Service,
} from '../types/booking';

export interface DemoStore {
  settings: SalonSettings;
  services: Service[];
  masters: Master[];
  schedules: MasterSchedule[];
  timeOffs: MasterTimeOff[];
  appointments: Appointment[];
}

const buildDefaultSchedules = (masters: Master[]): MasterSchedule[] => {
  const result: MasterSchedule[] = [];
  const offDayMap: Record<string, number> = {
    '22222222-2222-4222-8222-222222222201': 0, // Alina off Sunday
    '22222222-2222-4222-8222-222222222202': 1, // Damir off Monday
    '22222222-2222-4222-8222-222222222203': 2, // Maria off Tuesday
    '22222222-2222-4222-8222-222222222204': 1, // Timur off Monday
  };

  for (const master of masters) {
    for (let dow = 0; dow <= 6; dow++) {
      result.push({
        id: `sched-${master.id}-${dow}`,
        master_id: master.id,
        day_of_week: dow,
        is_working: offDayMap[master.id] !== dow,
        start_time: '10:00',
        end_time: '20:00',
        break_start: '14:00',
        break_end: '15:00',
      });
    }
  }
  return result;
};

export function createInitialDemoStore(): DemoStore {
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const tomorrowStr = toLocalDateString(addDays(today, 1));

  const services: Service[] = [
    {
      id: '11111111-1111-4111-8111-111111111101',
      name_ru: 'Женская стрижка и укладка',
      name_en: "Women's Haircut & Blowout",
      description_ru:
        'Консультация, мытьё головы с уходом, точная стрижка по форме лица и финальная укладка.',
      description_en:
        'Consultation, nourishing wash, precision tailored haircut, and signature blowout.',
      category_ru: 'Стрижки',
      category_en: 'Haircuts',
      duration_minutes: 60,
      price: 12000,
      is_active: true,
      sort_order: 1,
    },
    {
      id: '11111111-1111-4111-8111-111111111102',
      name_ru: 'Мужская стрижка',
      name_en: "Men's Haircut",
      description_ru:
        'Классическая или современная стрижка ножницами и машинкой, мытьё и укладка стайлингом.',
      description_en:
        'Classic or contemporary scissor and clipper cut with wash and styling.',
      category_ru: 'Стрижки',
      category_en: 'Haircuts',
      duration_minutes: 45,
      price: 7000,
      is_active: true,
      sort_order: 2,
    },
    {
      id: '11111111-1111-4111-8111-111111111103',
      name_ru: 'Моделирование бороды',
      name_en: 'Beard Sculpt & Grooming',
      description_ru:
        'Точная коррекция формы бороды, горячее полотенце и смягчающий бальзам.',
      description_en:
        'Precision beard shaping, hot towel ritual, and conditioning balm.',
      category_ru: 'Борода',
      category_en: 'Beard',
      duration_minutes: 30,
      price: 4500,
      is_active: true,
      sort_order: 3,
    },
    {
      id: '11111111-1111-4111-8111-111111111104',
      name_ru: 'Сложное окрашивание / Airtouch',
      name_en: 'Dimensional Color / Airtouch',
      description_ru:
        'Индивидуальный подбор оттенка, деликатное осветление, тонирование и защита структуры волос.',
      description_en:
        'Custom color formulation, seamless lightening, gloss toning, and bond protection.',
      category_ru: 'Окрашивание',
      category_en: 'Coloring',
      duration_minutes: 150,
      price: 45000,
      is_active: true,
      sort_order: 4,
    },
    {
      id: '11111111-1111-4111-8111-111111111105',
      name_ru: 'Укладка на брашинг или волны',
      name_en: 'Signature Blowout & Waves',
      description_ru:
        'Стойкий прикорневой объём и естественные локоны без утяжеления.',
      description_en:
        'Long-lasting root volume and effortless natural movement without heavy buildup.',
      category_ru: 'Укладка',
      category_en: 'Styling',
      duration_minutes: 45,
      price: 8000,
      is_active: true,
      sort_order: 5,
    },
    {
      id: '11111111-1111-4111-8111-111111111106',
      name_ru: 'Глубокое восстановление волос',
      name_en: 'Deep Repair Ritual',
      description_ru:
        'Многоступенчатый уход для блеска, эластичности и восстановления после термического воздействия.',
      description_en:
        'Multi-step restorative therapy for shine, elasticity, and heat-damage repair.',
      category_ru: 'Уход',
      category_en: 'Care',
      duration_minutes: 45,
      price: 14000,
      is_active: true,
      sort_order: 6,
    },
  ];

  const masters: Master[] = [
    {
      id: '22222222-2222-4222-8222-222222222201',
      name_ru: 'Алина Соколова',
      name_en: 'Alina Sokolova',
      role_ru: 'Арт-директор и топ-стилист',
      role_en: 'Art Director & Top Stylist',
      bio_ru:
        'Специализируется на архитектуре женских стрижек, которые держат форму даже спустя два месяца без сложной укладки.',
      bio_en:
        "Specializes in architectural women's cuts designed to hold their shape effortlessly between visits.",
      avatar_url: '/images/master-1.jpg',
      experience_years: 8,
      rating: 5.0,
      is_active: true,
      sort_order: 1,
      service_ids: [
        '11111111-1111-4111-8111-111111111101',
        '11111111-1111-4111-8111-111111111105',
        '11111111-1111-4111-8111-111111111106',
      ],
    },
    {
      id: '22222222-2222-4222-8222-222222222202',
      name_ru: 'Дамир Бекетов',
      name_en: 'Damir Beketov',
      role_ru: 'Ведущий барбер-стилист',
      role_en: 'Senior Barber & Stylist',
      bio_ru:
        'Чистые переходы, классические мужские силуэты и аккуратное оформление бороды.',
      bio_en: "Clean fades, timeless men's silhouettes, and precision beard grooming.",
      avatar_url: '/images/master-2.jpg',
      experience_years: 6,
      rating: 4.9,
      is_active: true,
      sort_order: 2,
      service_ids: [
        '11111111-1111-4111-8111-111111111102',
        '11111111-1111-4111-8111-111111111103',
      ],
    },
    {
      id: '22222222-2222-4222-8222-222222222203',
      name_ru: 'Мария Волкова',
      name_en: 'Maria Volkova',
      role_ru: 'Колорист-эксперт',
      role_en: 'Master Colorist',
      bio_ru:
        'Естественные блонды, мягкие рассветления и безопасные уходовые протоколы восстановления.',
      bio_en:
        'Natural dimensional blondes, seamless highlights, and restorative hair-care protocols.',
      avatar_url: '/images/master-3.jpg',
      experience_years: 7,
      rating: 4.9,
      is_active: true,
      sort_order: 3,
      service_ids: [
        '11111111-1111-4111-8111-111111111101',
        '11111111-1111-4111-8111-111111111104',
        '11111111-1111-4111-8111-111111111105',
        '11111111-1111-4111-8111-111111111106',
      ],
    },
    {
      id: '22222222-2222-4222-8222-222222222204',
      name_ru: 'Тимур Орлов',
      name_en: 'Timur Orlov',
      role_ru: 'Универсальный стилист',
      role_en: 'All-Round Stylist',
      bio_ru:
        'Современные текстурные стрижки для мужчин и женщин, работа с кудрявыми и непослушными волосами.',
      bio_en:
        'Modern textured cuts for all hair types, including curly and unruly textures.',
      avatar_url: '/images/master-4.jpg',
      experience_years: 4,
      rating: 4.8,
      is_active: true,
      sort_order: 4,
      service_ids: [
        '11111111-1111-4111-8111-111111111101',
        '11111111-1111-4111-8111-111111111102',
        '11111111-1111-4111-8111-111111111103',
        '11111111-1111-4111-8111-111111111105',
      ],
    },
  ];

  const appointments: Appointment[] = [
    {
      id: '33333333-3333-4333-8333-333333333301',
      booking_code: 'LN-481A',
      master_id: '22222222-2222-4222-8222-222222222201',
      service_id: '11111111-1111-4111-8111-111111111101',
      appointment_date: todayStr,
      start_time: '11:00',
      end_time: '12:00',
      duration_minutes: 60,
      price: 12000,
      client_name: 'Елена Морозова',
      client_phone: '+7 (701) 555-12-34',
      client_email: 'elena@example.com',
      notes: 'Подравнять концы, лёгкие волны',
      status: 'confirmed',
      created_by: 'client',
      created_at: new Date().toISOString(),
    },
    {
      id: '33333333-3333-4333-8333-333333333302',
      booking_code: 'LN-729C',
      master_id: '22222222-2222-4222-8222-222222222202',
      service_id: '11111111-1111-4111-8111-111111111102',
      appointment_date: tomorrowStr,
      start_time: '15:00',
      end_time: '15:45',
      duration_minutes: 45,
      price: 7000,
      client_name: 'Арман Нуртаев',
      client_phone: '+7 (777) 340-88-11',
      client_email: null,
      notes: null,
      status: 'pending',
      created_by: 'client',
      created_at: new Date().toISOString(),
    },
    {
      id: '33333333-3333-4333-8333-333333333303',
      booking_code: 'LN-104K',
      master_id: '22222222-2222-4222-8222-222222222203',
      service_id: '11111111-1111-4111-8111-111111111104',
      appointment_date: tomorrowStr,
      start_time: '10:30',
      end_time: '13:00',
      duration_minutes: 150,
      price: 45000,
      client_name: 'София Ким',
      client_phone: '+7 (705) 912-00-45',
      client_email: 'sofia.k@example.com',
      notes: 'Холодный бежевый оттенок',
      status: 'pending',
      created_by: 'client',
      created_at: new Date().toISOString(),
    },
  ];

  return {
    settings: {
      id: 1,
      salon_name: 'LINEA Hair Studio',
      address_ru: 'ул. Мира, 24, 2 этаж',
      address_en: '24 Mira St, 2nd Floor',
      phone: '+7 (700) 123-45-67',
      email: 'hello@linea-studio.example',
      currency: '₸',
      slot_interval_minutes: 30,
      booking_horizon_days: 21,
    },
    services,
    masters,
    schedules: buildDefaultSchedules(masters),
    timeOffs: [],
    appointments,
  };
}
