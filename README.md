# Дашборд СНП 2.0

Мониторинг проекта АО «Транстелеком» по подключению СНП и ГУ Пунктов пропуска к интернету. Next.js 14 + TypeScript + Tailwind + Recharts + TanStack Table.

## Разделы

- **Главная** — KPI по проекту (СНП, ГУ, ВОЛС, средняя готовность) + график готовности по областям.
- **ПИР-ПСД** — ~2750 СНП с прогрессом по 6 этапам (ИРД, изыскания, проектирование, согласования, землеустройство, экспертиза). Веса этапов берутся из листа «Вес ПИР».
- **ГУ Пункты пропуска** — 44 ПП, фильтры по ДГД и статусу, карточки по подразделениям, таблица.
- **ВОЛС** — протяжённости по СНП, итоги 2026/2027, топ-15 по длине.
- **СМР** — заглушка с готовым парсером (лист пока пустой).
- **ИТД** — чеклист видов исполнительной документации (заглушка).

## Установка

```bash
cd "/Users/robert/SNP 2.0"
npm install
cp .env.example .env.local
# Заполните SHEET_ID и GID_* (см. ниже)
npm run dev   # http://localhost:3002
```

Логин: `admin` / `Admin2025!` (см. `.env.local`).

## Источник данных — Google Sheets

1. Создайте Google Sheets документ, скопируйте 6 листов из `Форма_контроля_СНП_06_04_2026.xlsx`:
   - `ГУ Пункты пропуска`
   - `ПИР-ПСД`
   - `Вес ПИР` (или `«Вес» ПИР`)
   - `ВОЛС`
   - `СМР`
   - `ИТД`
2. Файл → Поделиться → Опубликовать в интернете → весь документ → CSV.
3. В URL вашего файла найдите `SHEET_ID`: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit#gid=<GID>`.
4. У каждого листа узнайте `gid` — это число после `?gid=` или `#gid=`.
5. Скопируйте всё в `.env.local`:

```env
SHEET_ID=1AbCdEf...
GID_GU=0
GID_PIR_PSD=123456
GID_PIR_WEIGHTS=234567
GID_VOLS=345678
GID_SMR=456789
GID_ITD=567890
ADMIN_LOGIN=admin
ADMIN_PASSWORD=Admin2025!
```

Данные обновляются автоматически каждые 60 секунд + кнопка ручного обновления на каждой странице.

## Деплой на Vercel

```bash
npm i -g vercel
vercel
```

После первого деплоя добавьте переменные окружения через панель Vercel: Settings → Environment Variables → добавьте `SHEET_ID`, `GID_*`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`. Затем `vercel --prod`.

## Архитектура

```
src/
├── app/
│   ├── api/
│   │   ├── auth/{login,logout,me}/route.ts   # cookie-сессии
│   │   ├── gu/route.ts                        # 6 эндпоинтов на 6 листов
│   │   ├── pir-psd/route.ts
│   │   ├── pir-weights/route.ts
│   │   ├── vols/route.ts
│   │   ├── smr/route.ts
│   │   └── itd/route.ts
│   ├── (страницы)/page.tsx
│   └── layout.tsx, globals.css
├── components/
│   ├── common/         # KpiCard, ProgressBar, PageHeader, EmptyState
│   └── layout/         # Sidebar, AppShell, ThemeProvider
├── hooks/              # useSheet (универсальный) + 6 специализированных
├── lib/
│   ├── auth.ts         # admin / cookie
│   ├── sheets.ts       # CSV fetcher
│   ├── apiRoute.ts     # фабрика API route с кэшем 30s
│   ├── dataHelpers.ts  # агрегации, форматирование
│   ├── types.ts
│   └── parsers/
│       ├── csv.ts              # RFC4180 parser + утилиты
│       ├── parseGU.ts
│       ├── parsePirPsd.ts      # мульти-уровневая шапка → 6 этапов
│       ├── parsePirWeights.ts
│       ├── parseVols.ts
│       ├── parseSmr.ts
│       └── parseItd.ts
└── middleware.ts       # защита всех маршрутов кроме /login
```

## Расчёт суммарной готовности ПИР

Веса берутся из листа «Вес ПИР» (с фолбэком на дефолты в `parsePirWeights.ts`):
- ИРД ≈ 7.5%
- Изыскания ≈ 15%
- Проектирование ≈ 37.5%
- Согласования ≈ 20%
- Землеустройство ≈ 10%
- Экспертиза ≈ 10%

Колонка «Суммарная готовность (%)» из листа ПИР-ПСД используется напрямую (расчёт уже сделан в формулах Excel). Функция `computeTotalReadiness()` в `dataHelpers.ts` доступна для пересчёта при необходимости.
