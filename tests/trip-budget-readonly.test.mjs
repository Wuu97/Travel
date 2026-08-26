import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readComponent = (name) => readFile(new URL(`../features/trip/components/${name}`, import.meta.url), "utf8");

test("budget components gate mutations through TripCapabilitiesContext while retaining read-only summaries", async () => {
  const [board, form, actualList, plannedList, capabilities] = await Promise.all([
    readComponent("TripBudgetBoard.tsx"),
    readComponent("ExpenseEntryForm.tsx"),
    readComponent("ActualExpenseList.tsx"),
    readComponent("PlannedExpenseList.tsx"),
    readComponent("TripCapabilities.tsx"),
  ]);

  assert.match(board, /const \{ canEditTrip \} = useTripCapabilities\(\)/);
  assert.match(board, /canAddExpense=\{canEditTrip\}/);
  assert.match(board, /BudgetSummary/);
  assert.match(board, /ExpenseDistribution/);

  assert.match(form, /const \{ canEditTrip \} = useTripCapabilities\(\)/);
  assert.equal((form.match(/disabled=\{!canEditTrip\}/g) ?? []).length, 9);
  assert.match(form, /<button disabled=\{!canEditTrip\} onClick=\{onSave\}/);

  assert.match(actualList, /const \{ canEditTrip \} = useTripCapabilities\(\)/);
  assert.match(actualList, /\{canEditTrip && <><button type="button" onClick=\{\(\) => onEdit\(expense\.id\)\}>编辑<\/button>/);
  assert.match(plannedList, /const \{ canEditTrip \} = useTripCapabilities\(\)/);
  assert.match(plannedList, /\{canEditTrip && <><button type="button" onClick=\{\(\) => onEdit\(item\.id\)\}>编辑<\/button>/);

  assert.match(capabilities, /canEditTrip: true/);
});
