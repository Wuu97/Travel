import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = [
  "features/shared/utils/createId.ts",
  "features/trip/model.ts",
  "features/trip/expense.ts",
  "features/trip/expenseRelations.ts",
  "features/trip/budgetRules.ts",
  "features/trip/utils.ts",
  "features/trip/snapshotValidation.ts",
  "features/trip/hooks/useTripImports.ts",
];

test("normalizes legacy LedgerItem data while retaining actual expense metadata", async () => {
  const compilation = await compileTypeScript(sources, "ledger-core-");
  try {
    const { normalizeTripExpense, createTripExpense } = await compilation.importModule("trip/expense.js");
    const legacy = normalizeTripExpense({ id: "old-1", item: " 午餐 ", type: "餐饮", amount: 88, by: "林" }, "actual");
    assert.deepEqual(legacy, { id: "old-1", title: "午餐", type: "餐饮", amount: 88, occurrence: "actual", payer: "林" });
    assert.deepEqual(createTripExpense({ id: "new-1", title: "地铁", type: "交通", amount: 5, occurrence: "actual", date: "2026-08-26", payer: "你", note: "机场线" }), { id: "new-1", title: "地铁", type: "交通", amount: 5, occurrence: "actual", date: "2026-08-26", payer: "你", note: "机场线" });
    assert.equal(normalizeTripExpense({ id: "bad", item: "", type: "餐饮", amount: 10 }, "actual"), null);
    assert.throws(() => createTripExpense({ title: "  ", type: "餐饮", amount: 10, occurrence: "actual" }));
    assert.throws(() => createTripExpense({ title: "午餐", type: "餐饮", amount: Number.NaN, occurrence: "actual" }));
  } finally { await compilation.cleanup(); }
});

test("imports selected AI expenses as unique estimated budget records", async () => {
  const compilation = await compileTypeScript(sources, "ledger-imports-");
  try {
    const { prepareExpenseImports } = await compilation.importModule("trip/hooks/useTripImports.js");
    const existing = [{ id: "stay", title: "住宿", amount: 1600, type: "住宿", occurrence: "estimated" }];
    const selected = [
      { id: "food", title: "餐饮", amount: 800, type: "餐饮", occurrence: "estimated" },
      { id: "ticket", title: "灵隐寺门票", amount: 75, type: "门票", occurrence: "estimated", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "灵隐寺" },
      { id: "food", title: "餐饮", amount: 800, type: "餐饮", occurrence: "estimated" },
      existing[0],
    ];
    assert.deepEqual(prepareExpenseImports(selected, existing), [
      { id: "food", title: "餐饮", amount: 800, type: "餐饮", occurrence: "estimated" },
      { id: "ticket", title: "灵隐寺门票", amount: 75, type: "门票", occurrence: "estimated" },
    ]);
    assert.deepEqual(prepareExpenseImports([selected[1]], [], "estimated", [{ id: "lingyin", title: "灵隐寺", type: "景点", day: 2 }])[0], { id: "ticket", title: "灵隐寺门票", amount: 75, type: "门票", occurrence: "estimated", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "灵隐寺" });
  } finally { await compilation.cleanup(); }
});

test("recognizes a re-parsed stable AI expense as already imported", async () => {
  const compilation = await compileTypeScript(sources, "ledger-reimport-");
  try {
    const { prepareExpenseImports } = await compilation.importModule("trip/hooks/useTripImports.js");
    const suggestion = { id: "ai-expense-stable", title: "住宿", amount: 1600, type: "住宿", occurrence: "estimated" };
    const imported = prepareExpenseImports([suggestion], []);
    assert.deepEqual(prepareExpenseImports([suggestion], imported), []);
  } finally { await compilation.cleanup(); }
});

test("keeps expense links stable on rename and safely unlinks them on itinerary deletion", async () => {
  const compilation = await compileTypeScript(sources, "ledger-relations-");
  try {
    const { clearExpenseRelation, getItineraryExpenseSummary, resolveExpenseRelation, syncExpenseRelationTitle } = await compilation.importModule("trip/expenseRelations.js");
    const plan = { id: "lingyin", title: "灵隐寺", type: "景点", day: 2 };
    const budget = [{ id: "ticket-budget", title: "门票", amount: 80, type: "门票", occurrence: "estimated", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "旧名称" }];
    const actual = [{ id: "ticket-actual", title: "门票", amount: 75, type: "门票", occurrence: "actual", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "旧名称" }];
    assert.deepEqual(getItineraryExpenseSummary("lingyin", budget, actual), { estimated: 80, actual: 75 });
    assert.equal(syncExpenseRelationTitle(budget, { ...plan, title: "灵隐飞来峰" })[0].relatedItineraryTitle, "灵隐飞来峰");
    assert.deepEqual(clearExpenseRelation(actual, "lingyin"), [{ id: "ticket-actual", title: "门票", amount: 75, type: "门票", occurrence: "actual" }]);
    assert.deepEqual(resolveExpenseRelation(budget[0], []), { id: "ticket-budget", title: "门票", amount: 80, type: "门票", occurrence: "estimated" });
    assert.equal(resolveExpenseRelation(budget[0], [plan]).relatedItineraryTitle, "灵隐寺");
  } finally { await compilation.cleanup(); }
});

test("moves shortened-trip plans to pending without changing IDs or expense links", async () => {
  const compilation = await compileTypeScript(sources, "trip-day-clamp-");
  try {
    const { clampItineraryDays, movePlansOutsideTripToPending } = await compilation.importModule("trip/utils.js");
    const { isStoredTrip } = await compilation.importModule("trip/snapshotValidation.js");
    const plans = [
      { id: "day-3", title: "A", type: "景点", day: 3 },
      { id: "day-4", title: "B", type: "餐饮", day: 4 },
      { id: "day-5", title: "C", type: "住宿", day: 5 },
    ];
    const shortened = movePlansOutsideTripToPending(plans, 3);
    assert.deepEqual(shortened.map((plan) => [plan.id, plan.day]), [["day-3", 3], ["day-4", 0], ["day-5", 0]]);
    assert.deepEqual(movePlansOutsideTripToPending(plans, 7), plans);
    assert.equal(shortened.some((plan) => plan.day < 0), false);
    assert.deepEqual(clampItineraryDays([{ ...plans[0], day: 0 }, { ...plans[1], day: -2 }, { ...plans[2], day: Number.NaN }]).map((plan) => plan.day), [0, 0, 1]);
    assert.equal(isStoredTrip({ plans: shortened, budgetItems: [{ id: "budget", title: "门票", amount: 80, type: "门票", occurrence: "estimated", relatedItineraryItemId: "day-4" }], expenses: [{ id: "actual", title: "门票", amount: 75, type: "门票", occurrence: "actual", relatedItineraryItemId: "day-4" }] }), true);
  } finally { await compilation.cleanup(); }
});

test("budget and actual totals update from the shared expense model", async () => {
  const compilation = await compileTypeScript(sources, "ledger-totals-");
  try {
    const { getBudgetOverview } = await compilation.importModule("trip/budgetRules.js");
    const budget = [{ id: "b", title: "酒店", type: "住宿", amount: 300, occurrence: "estimated" }];
    const actual = [{ id: "a", title: "酒店", type: "住宿", amount: 280, occurrence: "actual", payer: "你" }];
    assert.deepEqual(getBudgetOverview(budget, actual), { plannedTotal: 300, actualTotal: 280, remaining: 20 });
    assert.deepEqual(getBudgetOverview([], []), { plannedTotal: 0, actualTotal: 0, remaining: 0 });
  } finally { await compilation.cleanup(); }
});

test("compares category budgets and actuals, including overspend and unbudgeted spending", async () => {
  const compilation = await compileTypeScript(sources, "ledger-comparison-");
  try {
    const { getBudgetVsActual } = await compilation.importModule("trip/budgetRules.js");
    const budget = [
      { id: "food-budget", title: "餐饮", type: "餐饮", amount: 1500, occurrence: "estimated" },
      { id: "stay-budget", title: "住宿", type: "住宿", amount: 2000, occurrence: "estimated" },
    ];
    const actual = [
      { id: "food-actual", title: "晚餐", type: "餐饮", amount: 1200, occurrence: "actual" },
      { id: "stay-actual", title: "酒店", type: "住宿", amount: 2200, occurrence: "actual" },
      { id: "transport", title: "地铁", type: "交通", amount: 500, occurrence: "actual" },
    ];
    assert.deepEqual(getBudgetVsActual(budget, actual), {
      plannedTotal: 3500, actualTotal: 3900, remaining: -400, usageRate: 3900 / 3500 * 100,
      categories: [
        { category: "住宿", budget: 2000, actual: 2200, difference: -200 },
        { category: "餐饮", budget: 1500, actual: 1200, difference: 300 },
        { category: "交通", budget: 0, actual: 500, difference: -500 },
      ],
    });
    assert.deepEqual(getBudgetVsActual([], []), { plannedTotal: 0, actualTotal: 0, remaining: 0, usageRate: 0, categories: [] });
    assert.deepEqual(getBudgetVsActual([], [{ id: "actual", title: "咖啡", type: "餐饮", amount: 30, occurrence: "actual" }]), {
      plannedTotal: 0, actualTotal: 30, remaining: -30, usageRate: 0,
      categories: [{ category: "餐饮", budget: 0, actual: 30, difference: -30 }],
    });
  } finally { await compilation.cleanup(); }
});

test("scopes trip snapshots, libraries, and chat history by the active user", async () => {
  const compilation = await compileTypeScript([...sources, "features/trip/storage.ts", "features/chat/model.ts", "features/chat/storage.ts"], "storage-scope-");
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.window = {};
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try {
    const tripStorage = await compilation.importModule("trip/storage.js");
    const chatStorage = await compilation.importModule("chat/storage.js");
    const fallback = { expenses: [], budgetItems: [], plans: [] };
    const libraryFallback = { id: "trip", title: "默认", startDate: "2026-01-01", endDate: "2026-01-02", status: "筹备中" };

    assert.equal(tripStorage.getLocalStorageScope(), "guest");
    assert.notEqual(tripStorage.getTripSnapshotStorageKey("trip", "user-a"), tripStorage.getTripSnapshotStorageKey("trip", "user-b"));
    assert.notEqual(chatStorage.getChatStorageKey("user-a"), chatStorage.getChatStorageKey("user-b"));
    values.set("tuyu-local-trip:trip", JSON.stringify({ plans: [{ id: "legacy", title: "旧数据", type: "景点", day: 1 }] }));
    tripStorage.saveTrip({ ...fallback, plans: [{ id: "a", title: "A", type: "景点", day: 1 }] }, "trip", "user-a");
    tripStorage.saveTrip({ ...fallback, plans: [{ id: "b", title: "B", type: "景点", day: 0 }] }, "trip", "user-b");
    assert.equal(tripStorage.loadStoredTrip(fallback, "trip", "user-a").plans[0].id, "a");
    assert.equal(tripStorage.loadStoredTrip(fallback, "trip", "user-b").plans[0].id, "b");
    assert.deepEqual(tripStorage.loadStoredTrip(fallback, "trip", "guest"), fallback);

    assert.deepEqual(tripStorage.loadTripLibrary("new-user"), []);
    assert.equal(values.has(tripStorage.getTripLibraryStorageKey("new-user")), false);
    tripStorage.saveTripLibrary([{ ...libraryFallback, title: "A" }], "user-a");
    tripStorage.saveTripLibrary([{ ...libraryFallback, title: "B" }], "user-b");
    assert.equal(tripStorage.loadTripLibrary("user-a")[0].title, "A");
    assert.equal(tripStorage.loadTripLibrary("user-b")[0].title, "B");
    assert.deepEqual(tripStorage.mergeTripLibraryItems(
      [{ ...libraryFallback, id: "local", title: "本地" }, { ...libraryFallback, id: "shared", title: "旧标题" }],
      [{ ...libraryFallback, id: "shared", title: "云端标题", status: "进行中" }, { ...libraryFallback, id: "cloud", title: "云端旅行" }],
    ), [
      { ...libraryFallback, id: "local", title: "本地" },
      { ...libraryFallback, id: "shared", title: "云端标题", status: "进行中" },
      { ...libraryFallback, id: "cloud", title: "云端旅行" },
    ]);
    const cloudTrips = [{ ...libraryFallback, id: "cloud-a", title: "云端 A" }, { ...libraryFallback, id: "cloud-b", title: "云端 B" }];
    assert.equal(tripStorage.resolveInitialTripId(cloudTrips, null, libraryFallback.id), "cloud-a");
    assert.equal(tripStorage.resolveInitialTripId(cloudTrips, "cloud-b", libraryFallback.id), "cloud-b");
    assert.equal(tripStorage.resolveInitialTripId(cloudTrips, "missing", libraryFallback.id), "cloud-a");
    assert.equal(tripStorage.resolveInitialTripId([], null, libraryFallback.id), libraryFallback.id);
    assert.equal(values.has(tripStorage.getTripLibraryStorageKey("new-user")), false);
    chatStorage.saveChats([{ id: "a", title: "A", messages: [], createdAt: 1, updatedAt: 1 }], "user-a");
    chatStorage.saveChats([{ id: "b", title: "B", messages: [], createdAt: 2, updatedAt: 2 }], "user-b");
    assert.equal(chatStorage.loadSavedChats("user-a")[0].id, "a");
    assert.equal(chatStorage.loadSavedChats("user-b")[0].id, "b");
    assert.deepEqual(chatStorage.loadSavedChats("guest"), []);
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
    await compilation.cleanup();
  }
});
