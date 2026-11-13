-- LINEA Hair Studio — Seed Data (idempotent)
-- Run after 001_initial_schema.sql

-- 1. Default Salon Settings
insert into public.salon_settings (
  id, salon_name, address_ru, address_en, phone, email, currency, slot_interval_minutes, booking_horizon_days
) values (
  1,
  'LINEA Hair Studio',
  'ул. Мира, 24, 2 этаж',
  '24 Mira St, 2nd Floor',
  '+7 (700) 123-45-67',
  'hello@linea-studio.example',
  '₸',
  30,
  21
)
on conflict (id) do nothing;

-- 2. Services
insert into public.services (
  id, name_ru, name_en, description_ru, description_en, category_ru, category_en, duration_minutes, price, is_active, sort_order
) values
  (
    '11111111-1111-4111-8111-111111111101',
    'Женская стрижка и укладка',
    'Women''s Haircut & Blowout',
    'Консультация, мытьё головы с уходом, точная стрижка по форме лица и финальная укладка.',
    'Consultation, nourishing wash, precision tailored haircut, and signature blowout.',
    'Стрижки', 'Haircuts', 60, 12000, true, 1
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Мужская стрижка',
    'Men''s Haircut',
    'Классическая или современная стрижка ножницами и машинкой, мытьё и укладка стайлингом.',
    'Classic or contemporary scissor and clipper cut with wash and styling.',
    'Стрижки', 'Haircuts', 45, 7000, true, 2
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'Моделирование бороды',
    'Beard Sculpt & Grooming',
    'Точная коррекция формы бороды, горячее полотенце и смягчающий бальзам.',
    'Precision beard shaping, hot towel ritual, and conditioning balm.',
    'Борода', 'Beard', 30, 4500, true, 3
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'Сложное окрашивание / Airtouch',
    'Dimensional Color / Airtouch',
    'Индивидуальный подбор оттенка, деликатное осветление, тонирование и защита структуры волос.',
    'Custom color formulation, seamless lightening, gloss toning, and bond protection.',
    'Окрашивание', 'Coloring', 150, 45000, true, 4
  ),
  (
    '11111111-1111-4111-8111-111111111105',
    'Укладка на брашинг или волны',
    'Signature Blowout & Waves',
    'Стойкий прикорневой объём и естественные локоны без утяжеления.',
    'Long-lasting root volume and effortless natural movement without heavy buildup.',
    'Укладка', 'Styling', 45, 8000, true, 5
  ),
  (
    '11111111-1111-4111-8111-111111111106',
    'Глубокое восстановление волос',
    'Deep Repair Ritual',
    'Многоступенчатый уход для блеска, эластичности и восстановления после термического воздействия.',
    'Multi-step restorative therapy for shine, elasticity, and heat-damage repair.',
    'Уход', 'Care', 45, 14000, true, 6
  )
on conflict (id) do nothing;

-- 3. Masters
insert into public.masters (
  id, name_ru, name_en, role_ru, role_en, bio_ru, bio_en, avatar_url, experience_years, rating, is_active, sort_order
) values
  (
    '22222222-2222-4222-8222-222222222201',
    'Алина Соколова',
    'Alina Sokolova',
    'Арт-директор и топ-стилист',
    'Art Director & Top Stylist',
    'Специализируется на архитектуре женских стрижек, которые держат форму даже спустя два месяца без сложной укладки.',
    'Specializes in architectural women''s cuts designed to hold their shape effortlessly between visits.',
    '/images/master-1.jpg',
    8, 5.0, true, 1
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'Дамир Бекетов',
    'Damir Beketov',
    'Ведущий барбер-стилист',
    'Senior Barber & Stylist',
    'Чистые переходы, классические мужские силуэты и аккуратное оформление бороды.',
    'Clean fades, timeless men''s silhouettes, and precision beard grooming.',
    '/images/master-2.jpg',
    6, 4.9, true, 2
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'Мария Волкова',
    'Maria Volkova',
    'Колорист-эксперт',
    'Master Colorist',
    'Естественные блонды, мягкие рассветления и безопасные уходовые протоколы восстановления.',
    'Natural dimensional blondes, seamless highlights, and restorative hair-care protocols.',
    '/images/master-3.jpg',
    7, 4.9, true, 3
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    'Тимур Орлов',
    'Timur Orlov',
    'Универсальный стилист',
    'All-Round Stylist',
    'Современные текстурные стрижки для мужчин и женщин, работа с кудрявыми и непослушными волосами.',
    'Modern textured cuts for all hair types, including curly and unruly textures.',
    '/images/master-4.jpg',
    4, 4.8, true, 4
  )
on conflict (id) do nothing;

-- 4. Master <-> Services mapping
insert into public.master_services (master_id, service_id) values
  -- Alina: women cut, blowout, deep repair
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101'),
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111105'),
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111106'),
  -- Damir: men cut, beard
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111103'),
  -- Maria: women cut, color, blowout, deep repair
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111105'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111106'),
  -- Timur: women cut, men cut, beard, blowout
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111101'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111105')
on conflict do nothing;

-- 5. Default weekly schedules (0=Sun, 1=Mon ... 6=Sat)
do $$
declare
  m_id uuid;
  dow smallint;
begin
  for m_id in
    select id from public.masters where id in (
      '22222222-2222-4222-8222-222222222201',
      '22222222-2222-4222-8222-222222222202',
      '22222222-2222-4222-8222-222222222203',
      '22222222-2222-4222-8222-222222222204'
    )
  loop
    for dow in 0..6 loop
      insert into public.master_schedules (
        master_id, day_of_week, is_working, start_time, end_time, break_start, break_end
      ) values (
        m_id,
        dow,
        -- Example: Alina off on Sunday (0), Damir off on Monday (1), Maria off on Tuesday (2), Timur works Tue-Sun
        case
          when m_id = '22222222-2222-4222-8222-222222222201' and dow = 0 then false
          when m_id = '22222222-2222-4222-8222-222222222202' and dow = 1 then false
          when m_id = '22222222-2222-4222-8222-222222222203' and dow = 2 then false
          when m_id = '22222222-2222-4222-8222-222222222204' and dow = 1 then false
          else true
        end,
        '10:00',
        '20:00',
        '14:00',
        '15:00'
      )
      on conflict (master_id, day_of_week) do nothing;
    end loop;
  end loop;
end $$;

-- 6. IMPORTANT: Grant Admin Role to your Supabase Auth user!
-- After creating a user in Supabase Dashboard -> Authentication -> Users,
-- run the following query replacing the email with your admin's email:
--
-- insert into public.admin_users (user_id, email)
-- select id, email from auth.users where email = 'admin@example.com'
-- on conflict (user_id) do nothing;
