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
  const compilation = await compileTypeScript(["features/navigation/history.ts"], "trip-url-sync-");
  try {
    const { writeHistoryIfChanged } = await compilation.importModule("history.js");
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
