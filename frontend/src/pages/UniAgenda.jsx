import { useMemo, useState } from 'react';

const SESSION_KEY = 'uniagenda.session.v1';
const USERS_KEY = 'uniagenda.users.v1';

const monthFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
});

const dayFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function tasksKey(userId) {
  return `uniagenda.tasks.${userId}.v2`;
}

function initialTaskForm() {
  return {
    subject: '',
    title: '',
    date: getDateKey(new Date()),
    time: '08:00',
    priority: 'normal',
    checklistText: '',
  };
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function priorityStyles(priority) {
  if (priority === 'alta') return 'border-red-300 bg-red-50 text-red-800';
  if (priority === 'baja') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  return 'border-cyan-300 bg-cyan-50 text-cyan-800';
}

function sortedTasks(tasks) {
  return [...tasks].sort((first, second) =>
    `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`)
  );
}

function taskProgress(task) {
  const checklist = task.checklist ?? [];

  if (!checklist.length) {
    return { total: 1, completed: task.done ? 1 : 0, done: task.done };
  }

  const completed = checklist.filter((item) => item.done).length;
  return { total: checklist.length, completed, done: completed === checklist.length };
}

function createUserSession(form) {
  const email = normalizeEmail(form.email);
  const users = loadJson(USERS_KEY, {});
  const existingUser = users[email];
  const user = existingUser ?? {
    id: crypto.randomUUID(),
    name: form.name.trim() || email.split('@')[0],
    email,
    plan: 'gratis',
    createdAt: new Date().toISOString(),
  };

  users[email] = user;
  saveJson(USERS_KEY, users);
  saveJson(SESSION_KEY, user);
  return user;
}

function LoginPanel({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '' });

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(createUserSession(form));
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f2f6f9] px-3 py-4 text-[#18212f] sm:px-4 sm:py-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-300/70 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-[#18212f] p-6 text-white md:p-12">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-cyan-300">
            Planner universitario
          </p>
          <h1 className="max-w-xl text-4xl font-black leading-none sm:text-5xl md:text-6xl">
            UniAgenda
          </h1>
          <p className="mt-4 max-w-xl text-base font-semibold text-slate-300 sm:text-lg">
            Organiza materias, tareas y entregas en un calendario tipo checklist.
          </p>

          <div className="mt-8 hidden gap-3 sm:grid sm:grid-cols-3">
            {['Calendario', 'Checklist', 'Cuenta local'].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-black text-cyan-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 md:p-10">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            {[
              ['login', 'Iniciar sesión'],
              ['register', 'Crear cuenta'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`h-11 rounded-md text-sm font-black ${
                  mode === value ? 'bg-white text-[#18212f] shadow-sm' : 'text-slate-500'
                }`}
                type="button"
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {mode === 'register' ? (
              <label className="grid gap-2 text-sm font-black text-slate-500">
                Nombre
                <input
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Tu nombre"
                  required
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-black text-slate-500">
              Correo universitario
              <input
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="nombre@universidad.edu"
                required
              />
            </label>

            <button className="h-12 rounded-lg bg-[#1e6f8c] font-black text-white hover:bg-[#134e63]">
              {mode === 'register' ? 'Crear mi agenda' : 'Entrar a mi agenda'}
            </button>
          </form>

          <p className="mt-5 rounded-lg bg-amber-50 p-4 text-xs font-semibold text-amber-800 sm:text-sm">
            Versión MVP: la cuenta se guarda en este navegador. Luego la pasamos a base de datos,
            suscripciones y plan premium.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function UniAgenda() {
  const [user, setUser] = useState(() => loadJson(SESSION_KEY, null));
  const [tasks, setTasks] = useState(() => (user ? loadJson(tasksKey(user.id), []) : []));
  const [form, setForm] = useState(initialTaskForm);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activeFilter, setActiveFilter] = useState('pending');
  const [mobileView, setMobileView] = useState('tasks');

  const todayKey = getDateKey(new Date());
  const orderedTasks = useMemo(() => sortedTasks(tasks), [tasks]);

  const visibleTasks = orderedTasks.filter((task) => {
    const progress = taskProgress(task);
    if (activeFilter === 'all') return true;
    if (activeFilter === 'today') return task.date === todayKey;
    if (activeFilter === 'pending') return !progress.done;
    return task.date === activeFilter;
  });

  const stats = useMemo(() => {
    const weekLimit = new Date();
    weekLimit.setDate(weekLimit.getDate() + 7);

    return {
      today: tasks.filter((task) => !taskProgress(task).done && task.date === todayKey).length,
      week: tasks.filter((task) => {
        const dueDate = parseDateKey(task.date);
        return !taskProgress(task).done && dueDate >= parseDateKey(todayKey) && dueDate <= weekLimit;
      }).length,
      pending: tasks.filter((task) => !taskProgress(task).done).length,
    };
  }, [tasks, todayKey]);

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateKey = getDateKey(date);

      return {
        date,
        dateKey,
        outside: date.getMonth() !== month,
        tasks: orderedTasks.filter((task) => task.date === dateKey),
      };
    });
  }, [currentMonth, orderedTasks]);

  if (!user) {
    return (
      <LoginPanel
        onLogin={(nextUser) => {
          setUser(nextUser);
          setTasks(loadJson(tasksKey(nextUser.id), []));
        }}
      />
    );
  }

  const updateTasks = (nextTasks) => {
    setTasks(nextTasks);
    saveJson(tasksKey(user.id), nextTasks);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const checklist = form.checklistText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text) => ({ id: crypto.randomUUID(), text, done: false }));

    updateTasks([
      ...tasks,
      {
        id: crypto.randomUUID(),
        subject: form.subject.trim(),
        title: form.title.trim(),
        date: form.date,
        time: form.time,
        priority: form.priority,
        checklist,
        done: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    setForm(initialTaskForm());
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setTasks([]);
  };

  return (
    <main className="min-h-dvh bg-[#f2f6f9] text-[#18212f]">
      <section className="mx-auto w-full max-w-[1440px] px-3 pb-24 pt-3 sm:px-4 sm:py-7">
        <div className="sticky top-0 z-20 -mx-3 mb-3 border-b border-slate-200 bg-[#f2f6f9]/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="flex flex-col gap-4 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#1e6f8c]">
              Hola, {user.name}
            </p>
            <h1 className="text-3xl font-black leading-none sm:text-5xl md:text-7xl">UniAgenda</h1>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(3,minmax(96px,1fr))_auto]">
            {[
              ['hoy', stats.today],
              ['esta semana', stats.week],
              ['pendientes', stats.pending],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <strong className="block text-xl font-black sm:text-2xl">{value}</strong>
                <span className="text-xs font-bold text-slate-500 sm:text-sm">{label}</span>
              </article>
            ))}
            <button
              className="col-span-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm hover:bg-slate-50 sm:col-auto"
              type="button"
              onClick={logout}
            >
              Salir
            </button>
          </div>
          </div>
        </div>

        <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-2xl shadow-slate-400/40 backdrop-blur xl:hidden">
          {[
            ['tasks', 'Checklist'],
            ['calendar', 'Agenda'],
            ['new', 'Nueva'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`h-11 rounded-md text-sm font-black ${
                mobileView === value ? 'bg-[#18212f] text-white' : 'text-slate-500'
              }`}
              type="button"
              onClick={() => setMobileView(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_390px] xl:gap-5">
          <aside
            className={`rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5 ${
              mobileView === 'new' ? 'block' : 'hidden xl:block'
            }`}
          >
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#1e6f8c]">
              Nuevo pendiente
            </p>
            <h2 className="mb-5 text-2xl font-black">Añadir tarea</h2>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-black text-slate-500">
                Materia
                <input
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  placeholder="Cálculo, Inglés, Física..."
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-500">
                Tarea
                <textarea
                  className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Entregar taller, estudiar parcial..."
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-500">
                Checklist
                <textarea
                  className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                  value={form.checklistText}
                  onChange={(event) => setForm({ ...form, checklistText: event.target.value })}
                  placeholder={'Leer guía\nResolver ejercicios\nSubir PDF'}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-500">
                  Fecha
                  <input
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-500">
                  Hora
                  <input
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                    type="time"
                    value={form.time}
                    onChange={(event) => setForm({ ...form, time: event.target.value })}
                    required
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-black text-slate-500">
                Prioridad
                <select
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="baja">Baja</option>
                </select>
              </label>

              <button className="h-12 rounded-lg bg-[#1e6f8c] font-black text-white hover:bg-[#134e63]">
                Guardar checklist
              </button>
            </form>
          </aside>

          <section
            className={`rounded-lg border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/70 sm:p-5 ${
              mobileView === 'calendar' ? 'block' : 'hidden xl:block'
            }`}
          >
            <div className="mb-4 grid grid-cols-[44px_1fr_44px] items-center gap-3">
              <button
                className="h-11 rounded-lg bg-slate-100 text-3xl font-black"
                type="button"
                aria-label="Mes anterior"
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  )
                }
              >
                ‹
              </button>
              <h2 className="text-center text-lg font-black capitalize sm:text-2xl">
                {monthFormatter.format(currentMonth)}
              </h2>
              <button
                className="h-11 rounded-lg bg-slate-100 text-3xl font-black"
                type="button"
                aria-label="Mes siguiente"
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  )
                }
              >
                ›
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-7 bg-[#18212f] text-center text-[0.68rem] font-black text-white sm:text-xs">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <span key={day} className="px-1 py-3">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-slate-200">
                {monthDays.map((day) => {
                  const completed = day.tasks.filter((task) => taskProgress(task).done).length;

                  return (
                    <button
                      key={day.dateKey}
                      className={`min-h-[74px] bg-white p-1.5 text-left sm:min-h-[100px] sm:p-2 md:min-h-[128px] ${
                        day.outside ? 'text-slate-400' : 'text-[#18212f]'
                      } ${day.dateKey === todayKey ? 'outline outline-4 outline-cyan-100' : ''}`}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, date: day.dateKey });
                        setActiveFilter(day.dateKey);
                      }}
                    >
                      <span className="flex items-center justify-between gap-1 text-sm font-black sm:text-base">
                        {day.date.getDate()}
                        {day.tasks.length ? (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-cyan-100 px-1 text-[0.62rem] text-cyan-900 sm:h-6 sm:min-w-6 sm:text-xs">
                            {completed}/{day.tasks.length}
                          </span>
                        ) : null}
                      </span>

                      <span className="mt-1 grid gap-1 sm:mt-2">
                        {day.tasks.slice(0, 3).map((task) => {
                          const progress = taskProgress(task);

                          return (
                            <span
                              key={task.id}
                              className={`truncate rounded-md border-l-2 px-1.5 py-0.5 text-[0.62rem] font-black sm:border-l-4 sm:px-2 sm:py-1 sm:text-xs ${priorityStyles(
                                task.priority
                              )} ${progress.done ? 'line-through opacity-60' : ''}`}
                            >
                              {task.subject} · {progress.completed}/{progress.total}
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section
            className={`rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5 xl:max-h-[820px] ${
              mobileView === 'tasks' ? 'block' : 'hidden xl:block'
            }`}
          >
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#1e6f8c]">
              Seguimiento
            </p>
            <h2 className="mb-5 text-2xl font-black">Checklist</h2>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                ['pending', 'Pendientes'],
                ['today', 'Hoy'],
                ['all', 'Todas'],
              ].map(([filter, label]) => (
                <button
                  key={filter}
                  className={`h-10 rounded-lg text-sm font-black ${
                    activeFilter === filter ? 'bg-[#18212f] text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 overflow-auto xl:max-h-[670px]">
              {visibleTasks.length ? (
                visibleTasks.map((task) => {
                  const progress = taskProgress(task);
                  const checklist = task.checklist?.length
                    ? task.checklist
                    : [{ id: `${task.id}-main`, text: 'Marcar tarea completa', done: task.done }];

                  return (
                    <article
                      key={task.id}
                      className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${
                        progress.done ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-3">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-black">{task.subject}</strong>
                          <span className="block text-sm font-semibold text-slate-500">{task.title}</span>
                          <span className="mt-2 block text-xs font-black text-[#134e63]">
                            {dayFormatter.format(parseDateKey(task.date))} · {task.time} ·{' '}
                            {task.priority} · {progress.completed}/{progress.total}
                          </span>
                        </div>
                        <button
                          className="h-9 w-9 rounded-lg bg-red-50 text-xl font-black text-red-700"
                          type="button"
                          aria-label="Eliminar tarea"
                          onClick={() =>
                            updateTasks(tasks.filter((storedTask) => storedTask.id !== task.id))
                          }
                        >
                          ×
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {checklist.map((item) => (
                          <label
                            key={item.id}
                            className="grid grid-cols-[auto_1fr] items-start gap-2 rounded-md bg-white p-2 text-sm font-bold text-slate-600"
                          >
                            <input
                              className="mt-0.5 h-4 w-4 accent-[#1e6f8c]"
                              type="checkbox"
                              checked={item.done}
                              onChange={(event) =>
                                updateTasks(
                                  tasks.map((storedTask) => {
                                    if (storedTask.id !== task.id) return storedTask;

                                    if (!storedTask.checklist?.length) {
                                      return { ...storedTask, done: event.target.checked };
                                    }

                                    return {
                                      ...storedTask,
                                      checklist: storedTask.checklist.map((storedItem) =>
                                        storedItem.id === item.id
                                          ? { ...storedItem, done: event.target.checked }
                                          : storedItem
                                      ),
                                    };
                                  })
                                )
                              }
                            />
                            <span className={item.done ? 'line-through opacity-60' : ''}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center font-bold text-slate-500">
                  Sin tareas por aquí. Respira y sigue.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
