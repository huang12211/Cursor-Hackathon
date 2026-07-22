const MarrymapTimeline = {
  getWeekStartDate(weddingDate, weeksBefore) {
    const d = new Date(weddingDate + "T12:00:00");
    d.setDate(d.getDate() - weeksBefore * 7);
    return d;
  },

  getWeekEndDate(weekStart) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  },

  getCurrentWeeksBefore(weddingDate) {
    const wedding = new Date(weddingDate + "T12:00:00");
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diffMs = wedding - today;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diffDays / 7));
  },

  formatDateRange(start, end) {
    const opts = { month: "short", day: "numeric" };
    const y1 = start.getFullYear();
    const y2 = end.getFullYear();
    const s = start.toLocaleDateString("en-US", opts);
    const e = end.toLocaleDateString("en-US", opts);
    if (y1 !== y2) return `${s}, ${y1} – ${e}, ${y2}`;
    return `${s} – ${e}`;
  },

  formatShortDate(dateStr) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  },

  buildTimeline(plan) {
    const currentWeeksBefore = this.getCurrentWeeksBefore(plan.weddingDate);

    return PLANNING_WEEKS.map((week) => {
      const start = this.getWeekStartDate(plan.weddingDate, week.weeksBefore);
      const end = this.getWeekEndDate(start);
      const isPast = week.weeksBefore < currentWeeksBefore;
      const isCurrent = week.weeksBefore === currentWeeksBefore;
      const isFuture = week.weeksBefore > currentWeeksBefore;
      const completed = new Set(plan.completedTasks);

      const tasks = week.tasks.map((task) => {
        const done = completed.has(task.id);
        const overdue = isPast && !done;
        const atRisk = overdue && (task.decision || task.budget);
        return { ...task, done, overdue, atRisk };
      });

      const doneCount = tasks.filter((t) => t.done).length;
      const totalCount = tasks.length;
      const overdueCount = tasks.filter((t) => t.overdue).length;

      return {
        ...week,
        start,
        end,
        dateRange: this.formatDateRange(start, end),
        isPast,
        isCurrent,
        isFuture,
        tasks,
        doneCount,
        totalCount,
        overdueCount,
        progress: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
      };
    }).sort((a, b) => b.weeksBefore - a.weeksBefore);
  },

  getStats(timeline) {
    const allTasks = timeline.flatMap((w) => w.tasks);
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.done).length;
    const overdue = allTasks.filter((t) => t.overdue).length;
    const atRisk = allTasks.filter((t) => t.atRisk).length;
    const decisionsLeft = allTasks.filter((t) => t.decision && !t.done).length;
    const currentWeek = timeline.find((w) => w.isCurrent);
    const thisWeekDone = currentWeek ? currentWeek.doneCount : 0;
    const thisWeekTotal = currentWeek ? currentWeek.totalCount : 0;

    return {
      total,
      done,
      overdue,
      atRisk,
      decisionsLeft,
      progress: total ? Math.round((done / total) * 100) : 0,
      currentWeek,
      thisWeekDone,
      thisWeekTotal,
    };
  },
};

function initChecklistPage() {
  let plan = MarrymapStorage.getOrCreatePlan();

  const root = document.getElementById("checklist-app");
  if (!root) return;

  let filter = "all";
  let expandedWeek = MarrymapTimeline.getCurrentWeeksBefore(plan.weddingDate);

  function render() {
    plan = MarrymapStorage.getPlan();
    const timeline = MarrymapTimeline.buildTimeline(plan);
    const stats = MarrymapTimeline.getStats(timeline);
    const current = stats.currentWeek;

    root.innerHTML = `
      ${plan.isDemo ? `
        <div class="demo-banner">
          <span>Demo mode — explore the full checklist with sample data. No signup required.</span>
          <a href="/setup" class="btn btn-secondary btn-sm">Use your own details</a>
        </div>
      ` : ""}
      <div class="checklist-header">
        <div>
          <p class="checklist-eyebrow">${MarrymapTimeline.formatShortDate(plan.weddingDate)} · ${plan.venue || "Your venue"}</p>
          <h1>${plan.coupleNames}'s planning checklist</h1>
          <p class="checklist-sub">${stats.total} tasks across 26 weeks · ${stats.decisionsLeft} decisions still open</p>
        </div>
        <div class="checklist-header-actions">
          <a href="/setup" class="btn btn-secondary btn-sm">Edit details</a>
        </div>
      </div>

      <div class="checklist-stats">
        <div class="checklist-stat">
          <span class="checklist-stat-value">${stats.progress}%</span>
          <span class="checklist-stat-label">Complete</span>
        </div>
        <div class="checklist-stat">
          <span class="checklist-stat-value">${stats.thisWeekDone}/${stats.thisWeekTotal}</span>
          <span class="checklist-stat-label">This week</span>
        </div>
        <div class="checklist-stat ${stats.overdue ? "warn" : ""}">
          <span class="checklist-stat-value">${stats.overdue}</span>
          <span class="checklist-stat-label">Overdue</span>
        </div>
        <div class="checklist-stat ${stats.atRisk ? "risk" : ""}">
          <span class="checklist-stat-value">${stats.atRisk}</span>
          <span class="checklist-stat-label">At risk</span>
        </div>
      </div>

      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width: ${stats.progress}%"></div>
      </div>

      ${current ? renderCurrentWeek(current) : renderWeddingWeek()}

      <div class="checklist-toolbar">
        <div class="filter-tabs">
          <button class="filter-tab ${filter === "all" ? "active" : ""}" data-filter="all">All weeks</button>
          <button class="filter-tab ${filter === "open" ? "active" : ""}" data-filter="open">Open tasks</button>
          <button class="filter-tab ${filter === "decisions" ? "active" : ""}" data-filter="decisions">Decisions</button>
          <button class="filter-tab ${filter === "overdue" ? "active" : ""}" data-filter="overdue">Overdue</button>
        </div>
      </div>

      <div class="week-list">
        ${timeline
          .filter((week) => {
            if (filter === "all") return true;
            if (filter === "open") return week.tasks.some((t) => !t.done);
            if (filter === "decisions") return week.tasks.some((t) => t.decision && !t.done);
            if (filter === "overdue") return week.overdueCount > 0;
            return true;
          })
          .map((week) => renderWeek(week))
          .join("")}
      </div>
    `;

    bindEvents();
  }

  function renderWeddingWeek() {
    return `
      <section class="current-week-banner wedding-week">
        <h2>Your wedding week is here</h2>
        <p>Focus on the final tasks below. Everything else should be done — if something isn't, flag it now.</p>
      </section>
    `;
  }

  function renderCurrentWeek(week) {
    const openTasks = week.tasks.filter((t) => !t.done);
    return `
      <section class="current-week-banner ${week.overdueCount ? "has-overdue" : ""}">
        <div class="current-week-top">
          <span class="current-week-badge">This week · ${week.dateRange}</span>
          <span class="current-week-phase">${week.phase} — ${week.theme}</span>
        </div>
        <h2>${openTasks.length} task${openTasks.length === 1 ? "" : "s"} due this week</h2>
        ${week.overdueCount ? `<p class="current-week-warn">${week.overdueCount} from earlier weeks still open — review overdue filter.</p>` : ""}
        <ul class="current-week-tasks">
          ${openTasks.slice(0, 4).map((t) => `
            <li>
              <button class="task-check-btn" data-task="${t.id}" aria-label="Mark complete">${t.done ? "✓" : ""}</button>
              <span>${t.title}</span>
              ${t.decision ? '<span class="task-pill decision">Decision</span>' : ""}
              ${t.budget ? '<span class="task-pill budget">Budget</span>' : ""}
            </li>
          `).join("")}
          ${openTasks.length > 4 ? `<li class="more-tasks">+ ${openTasks.length - 4} more in week ${week.weeksBefore} below</li>` : ""}
        </ul>
      </section>
    `;
  }

  function renderWeek(week) {
    const isOpen = expandedWeek === week.weeksBefore;
    const statusClass = week.isCurrent ? "current" : week.isPast ? "past" : "future";
    const visibleTasks =
      filter === "open"
        ? week.tasks.filter((t) => !t.done)
        : filter === "decisions"
          ? week.tasks.filter((t) => t.decision && !t.done)
          : filter === "overdue"
            ? week.tasks.filter((t) => t.overdue)
            : week.tasks;

    if (filter !== "all" && visibleTasks.length === 0) return "";

    return `
      <article class="week-card ${statusClass} ${isOpen ? "open" : ""}" data-week="${week.weeksBefore}">
        <button class="week-card-header" aria-expanded="${isOpen}">
          <div class="week-card-left">
            <span class="week-number">${week.weeksBefore}w out</span>
            <div>
              <h3>${week.theme}</h3>
              <p class="week-meta">${week.dateRange} · ${week.phase}</p>
            </div>
          </div>
          <div class="week-card-right">
            ${week.isCurrent ? '<span class="week-status current">Current</span>' : ""}
            ${week.overdueCount ? `<span class="week-status overdue">${week.overdueCount} overdue</span>` : ""}
            <span class="week-progress">${week.doneCount}/${week.totalCount}</span>
            <span class="week-chevron">${isOpen ? "▾" : "▸"}</span>
          </div>
        </button>
        ${isOpen ? `
          <div class="week-card-body">
            <ul class="task-list">
              ${visibleTasks.map((task) => renderTask(task, week)).join("")}
            </ul>
          </div>
        ` : ""}
      </article>
    `;
  }

  function renderTask(task, week) {
    const note = plan.notes?.[task.id] || "";
    return `
      <li class="task-item ${task.done ? "done" : ""} ${task.atRisk ? "at-risk" : ""} ${task.overdue ? "overdue" : ""}" data-task-id="${task.id}">
        <button class="task-check-btn ${task.done ? "checked" : ""}" data-task="${task.id}" aria-label="${task.done ? "Mark incomplete" : "Mark complete"}">
          ${task.done ? "✓" : ""}
        </button>
        <div class="task-body">
          <div class="task-title-row">
            <span class="task-title">${task.title}</span>
            <span class="task-category">${CATEGORY_LABELS[task.category] || task.category}</span>
          </div>
          <div class="task-tags">
            ${task.decision ? '<span class="task-pill decision">Decision</span>' : ""}
            ${task.budget ? '<span class="task-pill budget">Budget</span>' : ""}
            ${task.vendor ? '<span class="task-pill vendor">Vendor email</span>' : ""}
            ${task.overdue ? '<span class="task-pill overdue">Overdue</span>' : ""}
            ${task.atRisk ? '<span class="task-pill risk">At risk</span>' : ""}
          </div>
          ${task.tip ? `<p class="task-tip">${task.tip}</p>` : ""}
          <details class="task-note-details">
            <summary>${note ? "Edit note" : "Add note"}</summary>
            <textarea class="task-note-input" data-note="${task.id}" placeholder="Your notes — quote amounts, vendor names, decisions...">${note}</textarea>
          </details>
        </div>
      </li>
    `;
  }

  function bindEvents() {
    root.querySelectorAll(".filter-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        filter = btn.dataset.filter;
        render();
      });
    });

    root.querySelectorAll(".week-card-header").forEach((header) => {
      header.addEventListener("click", () => {
        const week = Number(header.closest(".week-card").dataset.week);
        expandedWeek = expandedWeek === week ? null : week;
        render();
      });
    });

    root.querySelectorAll(".task-check-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        MarrymapStorage.toggleTask(btn.dataset.task);
        render();
      });
    });

    root.querySelectorAll(".task-note-input").forEach((textarea) => {
      textarea.addEventListener("blur", () => {
        MarrymapStorage.setNote(textarea.dataset.note, textarea.value);
      });
    });
  }

  render();
}

function initSetupPage() {
  const form = document.getElementById("setup-form");
  if (!form) return;

  const existing = MarrymapStorage.getPlan();
  if (existing) {
    form.coupleNames.value = existing.coupleNames || "";
    form.weddingDate.value = existing.weddingDate || "";
    form.venue.value = existing.venue || "";
    form.guestCount.value = existing.guestCount || "80-120";
  } else {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 6);
    form.weddingDate.value = defaultDate.toISOString().slice(0, 10);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      coupleNames: form.coupleNames.value.trim(),
      weddingDate: form.weddingDate.value,
      venue: form.venue.value.trim(),
      guestCount: form.guestCount.value,
    };

    if (existing) {
      MarrymapStorage.updatePlan({ ...data, isDemo: false });
    } else {
      MarrymapStorage.createPlan({ ...data, isDemo: false });
    }

    window.location.href = "/checklist";
  });

  const resetBtn = document.getElementById("reset-plan");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Clear all progress and start over?")) {
        MarrymapStorage.clearPlan();
        window.location.reload();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("checklist-app")) initChecklistPage();
  if (document.getElementById("setup-form")) initSetupPage();
});
