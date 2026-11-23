# Сайт команды ассистентов

## 1. Подготовьте Supabase
1. В Supabase откройте SQL Editor → New query.
2. Откройте `supabase/schema.sql`, замените `YOUR_ADMIN_EMAIL` на email, который будет использоваться для входа администратора.
3. Вставьте весь SQL в редактор и нажмите Run.
4. В Authentication → Users создайте пользователя-администратора с этим email и паролем.
5. В настройках Authentication отключите публичную регистрацию, если она не нужна.

## 2. Подключите сайт
1. Скопируйте `.env.example` в `.env`.
2. В Supabase откройте Project Settings → API. Скопируйте Project URL и публичный anon/publishable key в `.env`.
3. Установите Node.js, затем в папке проекта выполните `npm install` и `npm run dev`.

## 3. Публикация
Сайт можно разместить на Vercel или Netlify, добавив туда те же переменные окружения.
Админ-панель доступна по адресу `/admin`.

ВАЖНО: никогда не добавляйте `service_role` key в браузерный код или переменные `VITE_`. Используйте только публичный anon/publishable key.
