const STORAGE_KEY = "marrymap_plan";

const MarrymapStorage = {
  getPlan() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  savePlan(plan) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  },

  createPlan({ coupleNames, weddingDate, venue, guestCount, isDemo = false }) {
    const plan = {
      coupleNames,
      weddingDate,
      venue,
      guestCount,
      isDemo,
      createdAt: new Date().toISOString(),
      completedTasks: [],
      skippedTasks: [],
      notes: {},
    };
    this.savePlan(plan);
    return plan;
  },

  createDemoPlan() {
    const wedding = new Date();
    wedding.setDate(wedding.getDate() + 20 * 7);
    const weddingDate = wedding.toISOString().slice(0, 10);

    const plan = this.createPlan({
      coupleNames: "Alex & Sam",
      weddingDate,
      venue: "The Barn at Willow Creek",
      guestCount: "80-120",
      isDemo: true,
    });

    const completed = [];
    for (let w = 22; w <= 26; w++) {
      const week = PLANNING_WEEKS.find((wk) => wk.weeksBefore === w);
      if (week) week.tasks.forEach((t) => completed.push(t.id));
    }
    completed.push("w21-1", "w21-2", "w21-3");

    plan.completedTasks = completed;
    plan.notes = {
      "w23-3": "Lens & Light: $3,200 for 8hrs — seems fair vs $3,800 from Bloom Studio",
      "w23-5": "Catering quotes logged. Harvest Table flagged 18% above typical.",
    };
    this.savePlan(plan);
    return plan;
  },

  getOrCreatePlan() {
    return this.getPlan() || this.createDemoPlan();
  },

  updatePlan(updates) {
    const plan = this.getPlan();
    if (!plan) return null;
    const next = { ...plan, ...updates };
    this.savePlan(next);
    return next;
  },

  toggleTask(taskId) {
    const plan = this.getPlan();
    if (!plan) return null;
    const set = new Set(plan.completedTasks);
    if (set.has(taskId)) set.delete(taskId);
    else set.add(taskId);
    plan.completedTasks = [...set];
    this.savePlan(plan);
    return plan;
  },

  setNote(taskId, text) {
    const plan = this.getPlan();
    if (!plan) return null;
    plan.notes = plan.notes || {};
    if (text.trim()) plan.notes[taskId] = text.trim();
    else delete plan.notes[taskId];
    this.savePlan(plan);
    return plan;
  },

  clearPlan() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

if (typeof module !== "undefined") module.exports = MarrymapStorage;
