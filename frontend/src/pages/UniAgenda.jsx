import { useMemo, useState } from 'react';

const STORAGE_KEY = 'uniagenda.tasks.v1';

const monthFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
});

const dayFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const initialForm = {
  subject: '',
  title: '',
  date: getDateKey(new Date()),
  time: '08:00',
  priority: 'normal',
};

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

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function priorityStyles(priority) {
  if (priority === 'alta') {
    return 'border-red-300 bg-red-50 text-red-800';
  }

  if (priority === 'baja') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  }

  return 'border-cyan-300 bg-cyan-50 text-cyan-800';
}

function sortedTasks(tasks) {
  return [...tasks].sort((first, second) =>
    `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`)
  );
}

export default function UniAgenda() {
  const [tasks, setTasks] = useState(loadTasks);
  const [form, setForm] = useState(initialForm);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activeFilter, setActiveFilter] = useState('pending');

  const todayKey = getDateKey(new Date());
  const orderedTasks = useMemo(() => sortedTasks(tasks), [tasks]);

  const visibleTasks = orderedTasks.filter((task) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'today') return task.date === todayKey;
    if (activeFilter === 'pending') return !task.done;
    return task.date === activeFilter;
  });

  const stats = useMemo(() => {
    const weekLimit = new Date();
    weekLimit.setDate(weekLimit.getDate() + 7);

    return {
      today: tasks.filter((task) => !task.done && task.date === todayKey).length,
      week: tasks.filter((task) => {
        const dueDate = parseDateKey(task.date);
        return !task.done && dueDate >= parseDateKey(todayKey) && dueDate <= weekLimit;
      }).length,
      pending: tasks.filter((task) => !task.done).length,
    };
  }, [tasks, todayKey]);

  const updateTasks = (nextTasks) => {
    setTasks(nextTasks);
    saveTasks(nextTasks);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextTasks = [
      ...tasks,
      {
        id: crypto.randomUUID(),
        ...form,
        subject: form.subject.trim(),
        title: form.title.trim(),
        done: false,
        createdAt: new Date().toISOString(),
      },
    ];

    updateTasks(nextTasks);
    setForm(initialForm);
  };

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

  return (
    <main className="min-h-screen bg-[#f2f6f9] text-[#18212f]">
      <section className="mx-auto w-[min(1440px,calc(100%-32px))] py-7">
        <div className="flex flex-col gap-5 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#1e6f8c]">
              Planner universitario
            </p>
            <h1 className="text-5xl font-black leading-none md:text-7xl">UniAgenda</h1>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['hoy', stats.today],
              ['esta semana', stats.week],
              ['pendientes', stats.pending],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <strong className="block text-2xl font-black">{value}</strong>
                <span className="text-sm font-bold text-slate-500">{label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
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
                  className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[#18212f] outline-none focus:border-[#1e6f8c] focus:ring-4 focus:ring-cyan-100"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Entregar taller, estudiar parcial..."
                  required
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
                Guardar tarea
              </button>
            </form>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
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
              <h2 className="text-center text-2xl font-black capitalize">
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
              <div className="grid grid-cols-7 bg-[#18212f] text-center text-xs font-black text-white">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <span key={day} className="px-1 py-3">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-slate-200">
                {monthDays.map((day) => (
                  <button
                    key={day.dateKey}
                    className={`min-h-[92px] bg-white p-2 text-left md:min-h-[118px] ${
                      day.outside ? 'text-slate-400' : 'text-[#18212f]'
                    } ${day.dateKey === todayKey ? 'outline outline-4 outline-cyan-100' : ''}`}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, date: day.dateKey });
                      setActiveFilter(day.dateKey);
                    }}
                  >
                    <span className="flex items-center justify-between gap-1 font-black">
                      {day.date.getDate()}
                      {day.tasks.length ? (
                        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-cyan-100 px-1 text-xs text-cyan-900">
                          {day.tasks.length}
                        </span>
                      ) : null}
                    </span>

                    <span className="mt-2 hidden gap-1 md:grid">
                      {day.tasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className={`truncate rounded-md border-l-4 px-2 py-1 text-xs font-black ${priorityStyles(
                            task.priority
                          )}`}
                        >
                          {task.subject} · {task.time}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 xl:max-h-[760px]">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#1e6f8c]">
              Seguimiento
            </p>
            <h2 className="mb-5 text-2xl font-black">Tareas</h2>

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

            <div className="grid gap-3 overflow-auto xl:max-h-[610px]">
              {visibleTasks.length ? (
                visibleTasks.map((task) => (
                  <article
                    key={task.id}
                    className={`grid grid-cols-[auto_1fr_auto] gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${
                      task.done ? 'opacity-60' : ''
                    }`}
                  >
                    <input
                      className="mt-1 h-5 w-5 accent-[#1e6f8c]"
                      type="checkbox"
                      checked={task.done}
                      aria-label="Marcar tarea"
                      onChange={(event) =>
                        updateTasks(
                          tasks.map((storedTask) =>
                            storedTask.id === task.id
                              ? { ...storedTask, done: event.target.checked }
                              : storedTask
                          )
                        )
                      }
                    />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black">{task.subject}</strong>
                      <span className="block text-sm font-semibold text-slate-500">{task.title}</span>
                      <span className="mt-2 block text-xs font-black text-[#134e63]">
                        {dayFormatter.format(parseDateKey(task.date))} · {task.time} · {task.priority}
                      </span>
                    </div>
                    <button
                      className="h-9 w-9 rounded-lg bg-red-50 text-xl font-black text-red-700"
                      type="button"
                      aria-label="Eliminar tarea"
                      onClick={() => updateTasks(tasks.filter((storedTask) => storedTask.id !== task.id))}
                    >
                      ×
                    </button>
                  </article>
                ))
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
