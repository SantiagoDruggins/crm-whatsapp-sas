const storageKey = "uniagenda.tasks.v1";
const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
});

const form = document.querySelector("#taskForm");
const subjectInput = document.querySelector("#subjectInput");
const taskInput = document.querySelector("#taskInput");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const priorityInput = document.querySelector("#priorityInput");
const calendarGrid = document.querySelector("#calendarGrid");
const monthLabel = document.querySelector("#monthLabel");
const taskList = document.querySelector("#taskList");
const filterButtons = document.querySelectorAll(".filter");
const statToday = document.querySelector("#statToday");
const statWeek = document.querySelector("#statWeek");
const statPending = document.querySelector("#statPending");

let tasks = loadTasks();
let currentDate = new Date();
let activeFilter = "pending";

dateInput.value = toDateKey(new Date());
timeInput.value = "08:00";

document.querySelector("#prevMonth").addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  render();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderTasks();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  tasks.push({
    id: crypto.randomUUID(),
    subject: subjectInput.value.trim(),
    title: taskInput.value.trim(),
    date: dateInput.value,
    time: timeInput.value,
    priority: priorityInput.value,
    done: false,
    createdAt: new Date().toISOString(),
  });

  saveTasks();
  form.reset();
  dateInput.value = toDateKey(new Date());
  timeInput.value = "08:00";
  priorityInput.value = "normal";
  subjectInput.focus();
  render();
});

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function render() {
  renderCalendar();
  renderTasks();
  renderStats();
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  monthLabel.textContent = monthFormatter.format(currentDate);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(date);
    const dayTasks = sortedTasks().filter((task) => task.date === dateKey);
    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "day";
    dayButton.dataset.date = dateKey;

    if (date.getMonth() !== month) {
      dayButton.classList.add("outside");
    }

    if (dateKey === toDateKey(new Date())) {
      dayButton.classList.add("today");
    }

    dayButton.innerHTML = `
      <div class="day-number">
        <span>${date.getDate()}</span>
        ${dayTasks.length ? `<span class="task-dot">${dayTasks.length}</span>` : ""}
      </div>
      <div class="day-preview">
        ${dayTasks
          .slice(0, 3)
          .map(
            (task) =>
              `<span class="preview-chip ${priorityClass(task.priority)}">${escapeHtml(
                task.subject
              )} · ${escapeHtml(task.time)}</span>`
          )
          .join("")}
      </div>
    `;

    dayButton.addEventListener("click", () => {
      dateInput.value = dateKey;
      activeFilter = dateKey;
      filterButtons.forEach((item) => item.classList.remove("active"));
      renderTasks();
    });

    calendarGrid.appendChild(dayButton);
  }
}

function renderTasks() {
  const visibleTasks = sortedTasks().filter((task) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "today") return task.date === toDateKey(new Date());
    if (activeFilter === "pending") return !task.done;
    return task.date === activeFilter;
  });

  if (!visibleTasks.length) {
    taskList.innerHTML = `<div class="empty-state">Sin tareas por aquí. Respira y sigue.</div>`;
    return;
  }

  taskList.innerHTML = "";
  visibleTasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = `task-item ${task.done ? "done" : ""}`;
    item.innerHTML = `
      <input type="checkbox" ${task.done ? "checked" : ""} aria-label="Marcar tarea" />
      <div class="task-copy">
        <strong>${escapeHtml(task.subject)}</strong>
        <span>${escapeHtml(task.title)}</span>
        <div class="meta">${formatTaskDate(task.date)} · ${escapeHtml(task.time)} · ${priorityLabel(
          task.priority
        )}</div>
      </div>
      <button class="delete-btn" type="button" aria-label="Eliminar tarea">×</button>
    `;

    item.querySelector("input").addEventListener("change", (event) => {
      task.done = event.target.checked;
      saveTasks();
      render();
    });

    item.querySelector(".delete-btn").addEventListener("click", () => {
      tasks = tasks.filter((storedTask) => storedTask.id !== task.id);
      saveTasks();
      render();
    });

    taskList.appendChild(item);
  });
}

function renderStats() {
  const today = toDateKey(new Date());
  const weekLimit = new Date();
  weekLimit.setDate(weekLimit.getDate() + 7);

  statToday.textContent = tasks.filter((task) => !task.done && task.date === today).length;
  statWeek.textContent = tasks.filter((task) => {
    const dueDate = fromDateKey(task.date);
    return !task.done && dueDate >= fromDateKey(today) && dueDate <= weekLimit;
  }).length;
  statPending.textContent = tasks.filter((task) => !task.done).length;
}

function sortedTasks() {
  return [...tasks].sort((first, second) => {
    const firstDue = `${first.date}T${first.time}`;
    const secondDue = `${second.date}T${second.time}`;
    return firstDue.localeCompare(secondDue);
  });
}

function formatTaskDate(dateKey) {
  return dateFormatter.format(fromDateKey(dateKey));
}

function priorityLabel(priority) {
  const labels = {
    alta: "alta",
    normal: "normal",
    baja: "baja",
  };

  return labels[priority] ?? "normal";
}

function priorityClass(priority) {
  if (priority === "alta") return "high";
  if (priority === "baja") return "low";
  return "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
