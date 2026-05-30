const STORAGE_PREFIX = "dayroad-plan-";
const DAY_START = 8 * 60;
const DAY_END = 23 * 60;
const HOUR_HEIGHT = 82;

const seedTasks = [
  {
    id: "task-1",
    title: "기획안 초안",
    start: "08:30",
    duration: 90,
    section: "morning",
    priority: "high",
    done: true,
    notes: "핵심 목표, 예상 결과, 필요한 자료를 한 페이지로 정리",
    focus: false,
    checks: [
      { id: "c1", text: "목표 문장 다듬기", done: true },
      { id: "c2", text: "목차 3개로 압축", done: true },
    ],
  },
  {
    id: "task-2",
    title: "자료 조사",
    start: "10:15",
    duration: 75,
    section: "morning",
    priority: "medium",
    done: false,
    notes: "경쟁 서비스 사례와 수치만 먼저 모으기",
    focus: true,
    checks: [
      { id: "c3", text: "참고 링크 5개 확보", done: false },
      { id: "c4", text: "쓸모없는 자료 버리기", done: false },
    ],
  },
  {
    id: "task-3",
    title: "팀 미팅",
    start: "13:00",
    duration: 60,
    section: "afternoon",
    priority: "high",
    done: false,
    notes: "오전 산출물 기준으로 다음 액션 확정",
    focus: false,
    checks: [
      { id: "c5", text: "공유 안건 3개 작성", done: false },
      { id: "c6", text: "결정사항 기록", done: false },
    ],
  },
  {
    id: "task-4",
    title: "보고서 정리",
    start: "15:00",
    duration: 120,
    section: "afternoon",
    priority: "medium",
    done: false,
    notes: "미팅 결과를 반영해서 최종본으로 정리",
    focus: false,
    checks: [
      { id: "c7", text: "숫자 검증", done: false },
      { id: "c8", text: "요약 문장 추가", done: false },
    ],
  },
  {
    id: "task-5",
    title: "운동",
    start: "19:30",
    duration: 50,
    section: "evening",
    priority: "low",
    done: false,
    notes: "짧게라도 몸을 움직이고 하루를 닫기",
    focus: false,
    checks: [{ id: "c9", text: "물 챙기기", done: false }],
  },
];

const state = {
  date: todayISO(),
  selectedId: "task-2",
  tasks: [],
  activeView: "roadmap",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  planDate: $("#planDate"),
  prevDay: $("#prevDay"),
  nextDay: $("#nextDay"),
  savePlan: $("#savePlan"),
  resetPlan: $("#resetPlan"),
  taskForm: $("#taskForm"),
  bottomForm: $("#bottomForm"),
  timeRail: $("#timeRail"),
  timeline: $("#timeline"),
  roadmapView: $("#roadmapView"),
  agendaView: $("#agendaView"),
  agendaBody: $("#agendaBody"),
  roadmapSummary: $("#roadmapSummary"),
  progressRing: $("#progressRing"),
  progressValue: $("#progressValue"),
  progressText: $("#progressText"),
  selectedTaskEmpty: $("#selectedTaskEmpty"),
  detailForm: $("#detailForm"),
  deleteTask: $("#deleteTask"),
  checklist: $("#checklist"),
  addCheck: $("#addCheck"),
  focusToggle: $("#focusToggle"),
};

function todayISO() {
  const now = new Date();
  return localDateISO(now);
}

function localDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cloneTasks(tasks) {
  return JSON.parse(JSON.stringify(tasks));
}

function storageKey() {
  return `${STORAGE_PREFIX}${state.date}`;
}

function loadPlan(date) {
  state.date = date;
  const saved = localStorage.getItem(storageKey());
  state.tasks = saved ? JSON.parse(saved) : cloneTasks(seedTasks);
  state.selectedId = state.tasks[1]?.id || state.tasks[0]?.id || null;
}

function savePlan(showPulse = true) {
  localStorage.setItem(storageKey(), JSON.stringify(state.tasks));
  if (!showPulse) return;
  els.savePlan.innerHTML = icon("check") + "저장됨";
  window.setTimeout(() => {
    els.savePlan.innerHTML = icon("save") + "저장됨";
  }, 900);
}

function minutesFromTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(total) {
  const normalized = Math.max(0, total);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

function finishOf(task) {
  return minutesFromTime(task.start) + Number(task.duration);
}

function riskOf(task) {
  if (task.priority === "high") return { key: "danger", label: "늦어짐" };
  if (task.priority === "medium") return { key: "warn", label: "집중 필요" };
  if (task.priority === "low") return { key: "safe", label: "여유 있음" };

  const finish = finishOf(task);
  if (finish > 22 * 60) return { key: "danger", label: "늦어짐" };
  if (finish > 18 * 60 && task.section !== "evening") return { key: "warn", label: "밀릴 수 있음" };
  if (task.priority === "high" && !task.done) return { key: "warn", label: "집중 필요" };
  return { key: "safe", label: "여유 있음" };
}

function sectionByTime(start) {
  const minutes = minutesFromTime(start);
  if (minutes < 12 * 60) return "morning";
  if (minutes < 18 * 60) return "afternoon";
  return "evening";
}

function sortedTasks() {
  return [...state.tasks].sort((a, b) => minutesFromTime(a.start) - minutesFromTime(b.start));
}

function selectedTask() {
  return state.tasks.find((task) => task.id === state.selectedId);
}

function render() {
  els.planDate.value = state.date;
  renderLists();
  renderTimeline();
  renderAgenda();
  renderInspector();
  renderSummary();
  savePlan(false);
}

function renderLists() {
  const sections = { morning: [], afternoon: [], evening: [] };
  sortedTasks().forEach((task) => sections[task.section]?.push(task));

  Object.entries(sections).forEach(([section, tasks]) => {
    const list = $(`#${section}List`);
    const count = $(`#${section}Count`);
    list.innerHTML = "";
    count.textContent = tasks.length;

    tasks.forEach((task) => {
      const template = $("#taskItemTemplate").content.cloneNode(true);
      const button = template.querySelector(".task-row");
      button.classList.toggle("done", task.done);
      button.classList.toggle("active", task.id === state.selectedId);
      button.querySelector(".task-row-title").textContent = task.title;
      button.querySelector(".task-row-time").textContent = `${task.start} - ${timeFromMinutes(finishOf(task))}`;
      button.addEventListener("click", () => selectTask(task.id));
      list.appendChild(template);
    });
  });
}

function renderTimeline() {
  els.timeRail.innerHTML = "";
  els.timeline.innerHTML = "";

  for (let hour = 8; hour <= 22; hour += 1) {
    const label = document.createElement("span");
    label.className = "hour-label";
    label.style.top = `${(hour * 60 - DAY_START) / 60 * HOUR_HEIGHT}px`;
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    els.timeRail.appendChild(label);
  }

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= DAY_START && current <= DAY_END && state.date === todayISO()) {
    const line = document.createElement("div");
    line.className = "now-line";
    line.style.top = `${((current - DAY_START) / 60) * HOUR_HEIGHT}px`;
    els.timeline.appendChild(line);
  }

  sortedTasks().forEach((task) => {
    const start = minutesFromTime(task.start);
    const top = Math.max(0, ((start - DAY_START) / 60) * HOUR_HEIGHT);
    const height = Math.max(54, (task.duration / 60) * HOUR_HEIGHT - 8);
    const risk = riskOf(task);
    const item = document.createElement("article");
    item.className = `timeline-task ${task.priority} ${task.done ? "done" : ""} ${task.id === state.selectedId ? "active" : ""}`;
    item.style.top = `${top + 4}px`;
    item.style.height = `${height}px`;
    item.innerHTML = `
      <button class="check-button" aria-label="${task.title} 완료 상태 변경">${icon("check")}</button>
      <div class="task-main">
        <strong>${escapeHTML(task.title)}</strong>
        <span>${task.start} - ${timeFromMinutes(finishOf(task))} · ${formatDuration(task.duration)}</span>
      </div>
      <span class="risk-chip ${risk.key === "safe" ? "" : risk.key}">${risk.label}</span>
    `;
    item.addEventListener("click", () => selectTask(task.id));
    item.querySelector(".check-button").addEventListener("click", (event) => {
      event.stopPropagation();
      updateTask(task.id, { done: !task.done });
    });
    els.timeline.appendChild(item);
  });
}

function renderAgenda() {
  els.agendaBody.innerHTML = "";
  sortedTasks().forEach((task) => {
    const risk = riskOf(task);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${task.done ? "완료" : "진행 전"}</td>
      <td><strong>${escapeHTML(task.title)}</strong></td>
      <td>${task.start} · ${formatDuration(task.duration)}</td>
      <td>${timeFromMinutes(finishOf(task))}</td>
      <td><span class="risk-chip ${risk.key === "safe" ? "" : risk.key}">${risk.label}</span></td>
    `;
    row.addEventListener("click", () => selectTask(task.id));
    els.agendaBody.appendChild(row);
  });
}

function renderInspector() {
  const task = selectedTask();
  const doneCount = state.tasks.filter((item) => item.done).length;
  const progress = state.tasks.length ? Math.round((doneCount / state.tasks.length) * 100) : 0;
  els.progressRing.style.setProperty("--progress", progress);
  els.progressValue.textContent = `${progress}%`;
  els.progressText.textContent = `${doneCount}개 완료 · ${state.tasks.length - doneCount}개 남음`;

  if (!task) {
    els.selectedTaskEmpty.classList.remove("hidden");
    els.detailForm.classList.add("hidden");
    els.checklist.innerHTML = "";
    return;
  }

  const risk = riskOf(task);
  els.selectedTaskEmpty.classList.add("hidden");
  els.detailForm.classList.remove("hidden");
  $("#detailTitle").value = task.title;
  $("#detailStart").value = task.start;
  $("#detailDuration").value = task.duration;
  $("#detailRisk").value = task.priority || "low";
  $("#detailNotes").value = task.notes || "";
  $("#finishTime").textContent = timeFromMinutes(finishOf(task));
  $("#riskLabel").textContent = risk.label;
  $("#riskLabel").style.color = risk.key === "danger" ? "var(--coral)" : risk.key === "warn" ? "var(--amber)" : "var(--teal-dark)";
  els.focusToggle.classList.toggle("active", task.focus);
  els.focusToggle.setAttribute("aria-pressed", String(task.focus));
  renderChecklist(task);
}

function renderChecklist(task) {
  els.checklist.innerHTML = "";
  if (!task.checks?.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "마감 전에 확인할 체크 항목을 추가하세요.";
    els.checklist.appendChild(empty);
    return;
  }

  task.checks.forEach((check) => {
    const item = document.createElement("label");
    item.className = "check-item";
    item.innerHTML = `
      <input type="checkbox" ${check.done ? "checked" : ""} />
      <input type="text" value="${escapeHTML(check.text)}" />
      <button type="button" class="check-delete" aria-label="체크 항목 삭제">
        <svg viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 15h10l1-15" /></svg>
      </button>
    `;
    item.querySelector('input[type="checkbox"]').addEventListener("change", (event) => {
      mutateSelected((task) => {
        const target = task.checks.find((entry) => entry.id === check.id);
        target.done = event.target.checked;
      }, false);
    });
    item.querySelector('input[type="text"]').addEventListener("input", (event) => {
      mutateSelected((task) => {
        const target = task.checks.find((entry) => entry.id === check.id);
        target.text = event.target.value;
      }, false);
    });
    item.querySelector(".check-delete").addEventListener("click", () => {
      mutateSelected((task) => {
        task.checks = task.checks.filter((entry) => entry.id !== check.id);
      });
    });
    els.checklist.appendChild(item);
  });
}

function renderSummary() {
  const tasks = sortedTasks();
  const lastFinish = tasks.length ? Math.max(...tasks.map(finishOf)) : DAY_START;
  const plannedMinutes = tasks.reduce((total, task) => total + Number(task.duration), 0);
  const doneMinutes = tasks.filter((task) => task.done).reduce((total, task) => total + Number(task.duration), 0);
  els.roadmapSummary.textContent = `총 ${formatDuration(plannedMinutes)} 계획 · ${formatDuration(doneMinutes)} 완료 · 마지막 예상 ${timeFromMinutes(lastFinish)}`;
}

function selectTask(id) {
  state.selectedId = id;
  render();
}

function updateTask(id, patch) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));
  render();
}

function mutateSelected(mutator, shouldRender = true) {
  const task = selectedTask();
  if (!task) return;
  mutator(task);
  if (shouldRender) {
    render();
  } else {
    savePlan(false);
  }
}

function addTask(input) {
  const task = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    start: input.start,
    duration: Number(input.duration),
    section: input.section || sectionByTime(input.start),
    priority: input.priority || "medium",
    done: false,
    notes: "",
    focus: false,
    checks: [{ id: crypto.randomUUID(), text: "완료 기준 정하기", done: false }],
  };
  state.tasks.push(task);
  state.selectedId = task.id;
  render();
}

function changeDate(days) {
  const [year, month, day] = state.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  loadPlan(localDateISO(date));
  render();
}

function icon(name) {
  const icons = {
    save: '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>',
  };
  return icons[name] || "";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  els.planDate.addEventListener("change", (event) => {
    loadPlan(event.target.value);
    render();
  });

  els.prevDay.addEventListener("click", () => changeDate(-1));
  els.nextDay.addEventListener("click", () => changeDate(1));
  els.savePlan.addEventListener("click", () => savePlan(true));

  els.resetPlan.addEventListener("click", () => {
    state.tasks = cloneTasks(seedTasks);
    state.selectedId = state.tasks[1].id;
    render();
  });

  els.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask({
      title: $("#taskTitle").value,
      start: $("#taskStart").value,
      duration: $("#taskDuration").value,
      section: $("#taskSection").value,
      priority: $("#taskPriority").value,
    });
    els.taskForm.reset();
    $("#taskStart").value = "09:00";
    $("#taskDuration").value = "60";
    $("#taskSection").value = "morning";
    $("#taskPriority").value = "medium";
  });

  els.bottomForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = $("#bottomTitle").value.trim();
    if (!title) return;
    const last = sortedTasks().at(-1);
    const start = last ? timeFromMinutes(Math.min(finishOf(last) + 10, 21 * 60)) : "09:00";
    addTask({ title, start, duration: 30, priority: "medium" });
    $("#bottomTitle").value = "";
  });

  $("#detailTitle").addEventListener("input", (event) => mutateSelected((task) => (task.title = event.target.value)));
  $("#detailStart").addEventListener("input", (event) => {
    mutateSelected((task) => {
      task.start = event.target.value;
      task.section = sectionByTime(event.target.value);
    });
  });
  $("#detailDuration").addEventListener("input", (event) => mutateSelected((task) => (task.duration = Number(event.target.value))));
  $("#detailRisk").addEventListener("change", (event) => mutateSelected((task) => (task.priority = event.target.value)));
  $("#detailNotes").addEventListener("input", (event) => mutateSelected((task) => (task.notes = event.target.value)));
  els.focusToggle.addEventListener("click", () => mutateSelected((task) => (task.focus = !task.focus)));
  els.addCheck.addEventListener("click", () => {
    mutateSelected((task) => {
      task.checks = task.checks || [];
      task.checks.push({ id: crypto.randomUUID(), text: "새 체크 항목", done: false });
    });
  });
  els.deleteTask.addEventListener("click", () => {
    if (!state.selectedId) return;
    state.tasks = state.tasks.filter((task) => task.id !== state.selectedId);
    state.selectedId = sortedTasks()[0]?.id || null;
    render();
  });

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeView = tab.dataset.view;
      $$(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      els.roadmapView.classList.toggle("hidden", state.activeView !== "roadmap");
      els.agendaView.classList.toggle("hidden", state.activeView !== "agenda");
    });
  });
}

loadPlan(state.date);
bindEvents();
render();
