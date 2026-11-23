import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

const initial = {
  name: '',
  city_timezone: '',
  age: '',
  telegram: '',
  experience: '',
  current_activity: '',
  interesting_tasks: [],
  tools: '',
  strengths: '',
  desired_income: '',
  hours_per_day: '',
};

const taskOptions = [
  'Организация расписания и встреч',
  'Поиск информации и решение разных задач',
  'Общение с людьми и переписки',
  'Работа с документами и таблицами',
  'Контроль задач и дедлайнов',
  'Организационные и личные поручения',
];

const activityOptions = [
  'Работаю на полной занятости',
  'Работаю частично',
  'Учусь',
  'Нахожусь в поиске работы',
  'Занимаюсь своими проектами',
  'Другое',
];

const experienceOptions = [
  'Да, работала ассистентом',
  'Да, есть похожий опыт',
  'Нет, но хочу попробовать',
  'Нет, но быстро учусь',
];

const statusOptions = [
  ['new', 'Новая анкета'],
  ['contacted', 'Связались'],
  ['interview', 'Собеседование'],
  ['accepted', 'Принята'],
  ['irrelevant', 'Неактуально'],
];

export default function App() {
  const [form, setForm] = useState(initial);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [admin, setAdmin] = useState(
    window.location.pathname === '/admin' ||
    window.location.hash === '#admin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rows, setRows] = useState([]);

  function change(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function toggleTask(value) {
    setForm((previous) => {
      const selected = previous.interesting_tasks.includes(value);
      return {
        ...previous,
        interesting_tasks: selected
          ? previous.interesting_tasks.filter((item) => item !== value)
          : [...previous.interesting_tasks, value],
      };
    });
  }

  async function loadRows() {
    if (!supabase) {
      setError('Нет подключения к Supabase. Проверь файл .env.');
      return;
    }

    const { data, error: loadError } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      console.error('Ошибка загрузки кандидатов:', loadError);
      setError(`Не удалось загрузить анкеты: ${loadError.message}`);
      return;
    }

    setRows(data || []);
    setError('');
  }

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;

      if (sessionError) {
        console.error('Ошибка проверки сессии:', sessionError);
        setError(sessionError.message);
      }

      const currentSession = data?.session ?? null;
      setSession(currentSession);
      setAuthLoading(false);

      if (currentSession && admin) {
        loadRows();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);

      if (currentSession && admin) {
        // Не выполняем запросы Supabase внутри самого обработчика события.
        Promise.resolve().then(() => loadRows());
      } else if (!currentSession) {
        setRows([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [admin]);

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!supabase) {
      setError('Сначала подключи Supabase в файле .env.');
      return;
    }

    setBusy(true);

    const { error: insertError } = await supabase
      .from('candidates')
      .insert([{
        ...form,
        age: Number(form.age),
        status: 'new',
        notes: '',
      }]);

    setBusy(false);

    if (insertError) {
      console.error('Ошибка отправки анкеты:', insertError);
      setError(`Не удалось отправить анкету: ${insertError.message}`);
    } else {
      setSent(true);
    }
  }

  async function login(event) {
    event.preventDefault();
    setError('');

    if (!supabase) {
      setError('Нет подключения к Supabase. Проверь файл .env.');
      return;
    }

    setBusy(true);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (loginError) {
      console.error('Ошибка входа:', loginError);
      setError(`Не удалось войти: ${loginError.message}`);
      return;
    }

    setSession(data.session);
    await loadRows();
  }

  async function updateCandidate(id, patch) {
    const { error: updateError } = await supabase
      .from('candidates')
      .update(patch)
      .eq('id', id);

    if (updateError) {
      console.error('Ошибка обновления анкеты:', updateError);
      setError(`Не удалось сохранить изменения: ${updateError.message}`);
      return;
    }

    await loadRows();
  }

  async function logout() {
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(`Не удалось выйти: ${logoutError.message}`);
      return;
    }

    setSession(null);
    setRows([]);
  }

  function goToSite() {
    window.history.pushState({}, '', '/');
    setAdmin(false);
    setError('');
  }

  if (admin) {
    return (
      <main className="wrap">
        <header>
          <p className="eyebrow">ЗАКРЫТАЯ ПАНЕЛЬ</p>
          <h1>Анкеты кандидатов</h1>
          <button className="light" type="button" onClick={goToSite}>
            На сайт
          </button>
        </header>

        {authLoading ? (
          <section className="panel narrow">
            <p>Проверяем вход…</p>
          </section>
        ) : !session ? (
          <form className="panel narrow" onSubmit={login}>
            <h2>Вход администратора</h2>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? 'Входим…' : 'Войти'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        ) : (
          <section className="panel">
            <div className="bar">
              <h2>Кандидаты ({rows.length})</h2>
              <button type="button" onClick={loadRows}>Обновить</button>
              <button className="light" type="button" onClick={logout}>Выйти</button>
            </div>

            {error && <p className="error">{error}</p>}

            {rows.length === 0 && !error ? (
              <p>Пока нет анкет.</p>
            ) : (
              rows.map((candidate) => (
                <article className="candidate" key={candidate.id}>
                  <h3>
                    {candidate.name || 'Без имени'}
                    <small>
                      {' · '}
                      {candidate.created_at
                        ? new Date(candidate.created_at).toLocaleString('ru-RU')
                        : ''}
                    </small>
                  </h3>
                  <p>
                    Город и часовой пояс: {candidate.city_timezone || '—'}
                    {' · '}Возраст: {candidate.age ?? '—'}
                    {' · '}Telegram: {candidate.telegram || '—'}
                  </p>
                  <p>
                    Опыт: {candidate.experience || '—'}
                    {' · '}Сейчас: {candidate.current_activity || '—'}
                  </p>
                  <p>
                    Задачи: {Array.isArray(candidate.interesting_tasks)
                      ? candidate.interesting_tasks.join(', ')
                      : '—'}
                  </p>
                  <p>Инструменты: {candidate.tools || '—'}</p>
                  <p>Сильные стороны: {candidate.strengths || '—'}</p>
                  <p>
                    Доход: {candidate.desired_income || '—'}
                    {' · '}Часы: {candidate.hours_per_day || '—'}
                  </p>
                  <label>
                    Статус
                    <select
                      value={candidate.status || 'new'}
                      onChange={(event) =>
                        updateCandidate(candidate.id, { status: event.target.value })
                      }
                    >
                      {statusOptions.map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Заметка
                    <textarea
                      defaultValue={candidate.notes || ''}
                      onBlur={(event) =>
                        updateCandidate(candidate.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </article>
              ))
            )}
          </section>
        )}
      </main>
    );
  }

  if (sent) {
    return (
      <main className="wrap">
        <section className="hero center">
          <p className="eyebrow">КОМАНДА АССИСТЕНТОВ</p>
          <h1>Спасибо за ответы! ❤️</h1>
          <h2>Хочешь узнать подробнее?</h2>
          <p>
            Расскажу, как устроена работа ассистента, какие есть возможности
            для заработка и как можно присоединиться к команде.
          </p>
          <a
            className="button"
            href="https://t.me/AnastasiyaYermalovich"
            target="_blank"
            rel="noreferrer"
          >
            Написать мне в Telegram
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header>
        <p className="eyebrow">КОМАНДА АССИСТЕНТОВ</p>
        <h1>Давай познакомимся</h1>
        <p className="intro">
          Ответь на 10 вопросов — это поможет мне узнать тебя и понять,
          какие задачи могут тебе подойти.
        </p>
      </header>

      <form className="panel" onSubmit={submit}>
        <label>
          1. Как тебя зовут?
          <input
            value={form.name}
            onChange={(event) => change('name', event.target.value)}
            required
          />
        </label>

        <label>
          2. Из какого ты города и какой у тебя часовой пояс?
          <input
            value={form.city_timezone}
            onChange={(event) => change('city_timezone', event.target.value)}
            required
          />
        </label>

        <label>
          3. Сколько тебе лет?
          <input
            type="number"
            min="16"
            value={form.age}
            onChange={(event) => change('age', event.target.value)}
            required
          />
        </label>

        <label>
          4. Оставь свой Telegram для связи.
          <input
            placeholder="@username"
            value={form.telegram}
            onChange={(event) => change('telegram', event.target.value)}
            required
          />
        </label>

        <fieldset>
          <legend>
            5. Есть ли у тебя опыт работы ассистентом или в административной/организационной деятельности?
          </legend>
          {experienceOptions.map((value) => (
            <label className="choice" key={value}>
              <input
                type="radio"
                name="experience"
                required
                checked={form.experience === value}
                onChange={() => change('experience', value)}
              />
              {value}
            </label>
          ))}
        </fieldset>

        <label>
          6. Чем ты сейчас занимаешься?
          <select
            required
            value={form.current_activity}
            onChange={(event) => change('current_activity', event.target.value)}
          >
            <option value="">Выбери вариант</option>
            {activityOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>7. Какие задачи тебе было бы интересно выполнять? (можно несколько)</legend>
          {taskOptions.map((value) => (
            <label className="choice" key={value}>
              <input
                type="checkbox"
                checked={form.interesting_tasks.includes(value)}
                onChange={() => toggleTask(value)}
              />
              {value}
            </label>
          ))}
        </fieldset>

        <label>
          8. Какими сервисами и инструментами ты умеешь пользоваться? Например Google Docs, таблицы, Notion, Trello, Canva, ChatGPT.
          <textarea
            value={form.tools}
            onChange={(event) => change('tools', event.target.value)}
            required
          />
        </label>

        <label>
          9. Какие свои качества ты считаешь сильными сторонами в работе? Например ответственность, внимательность, инициативность, организованность, коммуникабельность.
          <textarea
            value={form.strengths}
            onChange={(event) => change('strengths', event.target.value)}
            required
          />
        </label>

        <label>
          10. Какой доход ты хотела бы получать?
          <input
            value={form.desired_income}
            onChange={(event) => change('desired_income', event.target.value)}
            required
          />
        </label>

        <label>
          Сколько часов в день готова уделять работе?
          <select
            value={form.hours_per_day}
            onChange={(event) => change('hours_per_day', event.target.value)}
            required
          >
            <option value="">Выбери вариант</option>
            {['2–3 часа', '3–5 часов', '5–8 часов', 'Гибкий график'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Отправляем…' : 'Отправить ответы'}
        </button>
      </form>

      <footer>
        <a href="/admin">Вход для администратора</a>
      </footer>
    </main>
  );
}
