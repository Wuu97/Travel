import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

function createBrowser(pathname, search = "", hash = "") {
  const calls = [];
  const location = { pathname, search, hash };
  const history = {
    replaceState: (_state, _title, url) => calls.push(["replace", url]),
    pushState: (_state, _title, url) => calls.push(["push", url]),
  };
  return { calls, history, location };
}

test("trip URL 同步仅在真实导航时写 history 并派发 tripchange", async () => {
  const compilation = await compileTypeScript(["features/navigation/history.ts", "features/trip/librarySelection.ts", "features/trip/model.ts"], "trip-url-sync-");
  try {
    const { writeHistoryIfChanged } = await compilation.importModule("navigation/history.js");
    const { selectTripFromLibrary } = await compilation.importModule("trip/librarySelection.js");
    const items = [{ id: "a", title: "A", startDate: "2026-01-01", endDate: "2026-01-02", status: "筹备中" }];
    assert.deepEqual(selectTripFromLibrary(items, "a"), { selectedTripId: "a", needsUrlCorrection: false });
    assert.deepEqual(selectTripFromLibrary(items, "stale"), { selectedTripId: "a", needsUrlCorrection: true });
    assert.deepEqual(selectTripFromLibrary([], "stale"), { selectedTripId: null, needsUrlCorrection: true });
    const same = createBrowser("/", "?trip=a&day=1");
    assert.equal(writeHistoryIfChanged("replace", new URL("https://travel.test/?trip=a&day=1"), same.location, same.history), false);
    assert.deepEqual(same.calls, []);

    const changed = createBrowser("/", "?trip=a&day=1");
    let tripChanges = 0;
    if (writeHistoryIfChanged("replace", new URL("https://travel.test/?trip=b&day=1"), changed.location, changed.history)) tripChanges += 1;
    assert.deepEqual(changed.calls, [["replace", "/?trip=b&day=1"]]);
    assert.equal(tripChanges, 1);
    if (writeHistoryIfChanged("replace", new URL("https://travel.test/?trip=a&day=1"), same.location, same.history)) tripChanges += 1;
    assert.equal(tripChanges, 1);

    const stale = createBrowser("/", "?trip=deleted&day=2");
    const emptyUrl = new URL("https://travel.test/");
    assert.equal(writeHistoryIfChanged("replace", emptyUrl, stale.location, stale.history), true);
    assert.equal(writeHistoryIfChanged("replace", emptyUrl, { pathname: "/", search: "", hash: "" }, stale.history), false);
    assert.deepEqual(stale.calls, [["replace", "/"]]);

    const fallback = createBrowser("/", "?trip=deleted&day=2");
    assert.equal(writeHistoryIfChanged("push", new URL("https://travel.test/?trip=remaining&day=1"), fallback.location, fallback.history), true);
    assert.deepEqual(fallback.calls, [["push", "/?trip=remaining&day=1"]]);
  } finally {
    await compilation.cleanup();
  }
});
