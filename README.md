# LINEA Hair Studio — Онлайн-запись и Админ-панель

Сайт парикмахерской с онлайн-записью (выбор услуги, мастера, даты и свободного времени), двуязычным интерфейсом (**RU / EN**) и защищённой панелью администратора.
База данных и авторизация построены на **Supabase**, а сборка адаптирована под деплой на **Cloudflare Pages / Workers**.

## Возможности

- **Для клиентов (`/`)**:
  - Каталог услуг с фильтрацией по категориям, ценой и длительностью.
  - Карточки мастеров с опытом, рейтингом и переходом к записи.
  - Пошаговая онлайн-запись: Услуга → Мастер → Дата и свободные слоты (с учётом длительности, перерывов, выходных и уже занятых записей) → Контакты и код бронирования `LN-XXXXX`.
- **Для администратора (`/admin`)**:
  - Подтверждение, отмена и завершение записей, фильтры по дате/статусу/мастеру и поиск.
  - Ручное добавление новой записи (включая опциональный оверрайд поверх занятого времени).
  - Управление мастерами, привязка услуг, настройка недельного графика (часы работы и перерывы) и разовых выходных дней.
  - Управление услугами и общими настройками студии (валюта `₸` / `₽` / `$` / `€`, шаг сетки записи).
- **Безопасность (Supabase RLS + RPC)**:
  - Анонимные посетители не могут читать таблицу `appointments` (нет утечки телефонов и имён клиентов).
  - Занятость слотов отдаётся через безопасную функцию `get_busy_intervals`.
  - Публичное создание записи через `create_public_booking` с блокировкой `pg_advisory_xact_lock` для защиты от двойного бронирования.

---

## Локальный запуск

1. Установите зависимости:
   ```bash
   npm install
   ```
2. Запустите сервер разработки:
   ```bash
   npm run dev
   ```
   > Без настроенного `.env` сайт автоматически запускается в **локальном Demo-режиме** (`localStorage`), чтобы вы могли сразу протестировать и запись клиентов, и админ-панель.

---

## Подключение Supabase (`supabase.com`)

1. Создайте проект на [supabase.com](https://supabase.com).
2. Откройте **SQL Editor** в панели Supabase и выполните по порядку:
   - [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)
   - [`supabase/seed.sql`](./supabase/seed.sql)
3. Создайте учётную запись администратора в **Authentication → Users → Add user** (email + пароль).
4. Добавьте этого пользователя в таблицу `admin_users`, выполнив в SQL Editor (подставьте ваш email):
   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```
5. Скопируйте `.env.example` в `.env` и вставьте **Project URL** и **anon public key** из **Project Settings → API**:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

---

## Деплой на Cloudflare

### Вариант 1: Cloudflare Pages (через Git или Wrangler)
1. Подключите репозиторий в **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
2. Настройки сборки:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. В **Settings → Environment variables** добавьте `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
4. SPA-маршруты (`/admin`) уже настроены через [`public/_redirects`](./public/_redirects).

Или вручную через CLI:
```bash
npm run build
npx wrangler pages deploy dist --project-name linea-hair-studio
```

### Вариант 2: Cloudflare Workers Static Assets
В корне проекта уже подготовлен [`wrangler.jsonc`](./wrangler.jsonc) с `"not_found_handling": "single-page-application"`:
```bash
npm run build
npx wrangler deploy
```

