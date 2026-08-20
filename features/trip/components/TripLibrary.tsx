"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { defaultTripDetails, getDefaultStoredTrip, statusTagColors } from "../data";
import type { TripDetails, TripLibraryItem } from "../model";
import { loadTripDetails, loadTripLibrary, removeTripStorage, saveTrip, saveTripDetails, saveTripLibrary } from "../storage";

const defaultLibraryTrip: TripLibraryItem = {
  id: "hangzhou-summer-trip",
  title: defaultTripDetails.title,
  startDate: defaultTripDetails.startDate,
  endDate: defaultTripDetails.endDate,
  status: defaultTripDetails.status,
};

const newTripId = () => `trip-${Date.now().toString(36)}`;
const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

type TripDraft = { destination: string; startDate: string; endDate: string; companions: string };

const defaultTripDraft = (): TripDraft => ({
  destination: "",
  startDate: defaultTripDetails.startDate,
  endDate: defaultTripDetails.endDate,
  companions: "",
});

export function TripLibrary({ currentDetails }: { currentDetails: TripDetails }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientHydrationState, getServerHydrationState);
  const [activeTripId, setActiveTripId] = useState(defaultLibraryTrip.id);
  const [items, setItems] = useState<TripLibraryItem[]>([defaultLibraryTrip]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TripDraft>(defaultTripDraft);

  useEffect(() => {
    if (!hydrated) return;
    setActiveTripId(new URLSearchParams(window.location.search).get("trip") || defaultLibraryTrip.id);
    const loadedItems = loadTripLibrary(defaultLibraryTrip).map((item) => ({ ...item, status: loadTripDetails(defaultTripDetails, item.id).status }));
    setItems(loadedItems);
    saveTripLibrary(loadedItems);
    setLibraryLoaded(true);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !libraryLoaded) return;
    setItems((current) => {
      const next = current.map((item) => item.id === activeTripId
        ? { ...item, title: currentDetails.title, startDate: currentDetails.startDate, endDate: currentDetails.endDate, status: currentDetails.status }
        : item);
      if (next.some((item, index) => item !== current[index])) saveTripLibrary(next);
      return next;
    });
  }, [activeTripId, currentDetails.endDate, currentDetails.startDate, currentDetails.status, currentDetails.title, hydrated, libraryLoaded]);

  const openTrip = (tripId: string) => {
    if (tripId === activeTripId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("trip", tripId);
    sessionStorage.setItem("tuyu-scroll-position", String(window.scrollY));
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event("tuyu-tripchange"));
  };

  const createTrip = () => {
    const destination = draft.destination.trim();
    if (!destination || draft.endDate < draft.startDate) return;
    const id = newTripId();
    const companions = ["你", ...draft.companions.split(/[,，]/).map((name) => name.trim()).filter(Boolean)];
    const uniqueCompanions = [...new Set(companions)];
    const details: TripDetails = { ...defaultTripDetails, title: destination, startDate: draft.startDate, endDate: draft.endDate, status: "筹备中", companions: uniqueCompanions, memberRoles: Object.fromEntries(uniqueCompanions.filter((name) => name !== "你").map((name) => [name, "同行人"])) };
    const nextItems = [...items, { id, title: details.title, startDate: details.startDate, endDate: details.endDate, status: details.status }];
    saveTrip(getDefaultStoredTrip(), id);
    saveTripDetails(details, id);
    saveTripLibrary(nextItems);
    setItems(nextItems);
    setCreateOpen(false);
    setDraft(defaultTripDraft());
    openTrip(id);
  };

  const deleteTrip = (tripId: string) => {
    if (items.length === 1) {
      window.alert("请至少保留一个行程。");
      return;
    }
    const trip = items.find((item) => item.id === tripId);
    if (!trip || !window.confirm(`确定删除“${trip.title}”吗？此操作无法撤销。`)) return;
    const nextItems = items.filter((item) => item.id !== tripId);
    removeTripStorage(tripId);
    saveTripLibrary(nextItems);
    setItems(nextItems);
    if (tripId === activeTripId) openTrip(nextItems[0].id);
  };

  return <section className="trip-library" aria-label="我的行程">
    <div className="trip-library-heading"><span>我的行程</span><button type="button" onClick={() => setCreateOpen(true)}>+ 新建行程</button></div>
    <div className="trip-library-list">
      {items.map((item) => {
        const status = item.id === activeTripId ? currentDetails.status : item.status || "筹备中";
        return <div className={`trip-library-item ${item.id === activeTripId ? "selected" : ""}`} key={item.id}>
          <button className="trip-library-open" type="button" onClick={() => openTrip(item.id)}><b>{item.title}</b><small>{item.startDate} - {item.endDate}</small><em style={statusTagColors[status]}>{status}</em></button>
        <button aria-label={`删除${item.title}`} className="trip-library-delete" title="删除行程" type="button" onClick={() => deleteTrip(item.id)}>×</button>
        </div>;
      })}
    </div>
    {createOpen && <div aria-modal="true" className="edit-plan-backdrop" role="dialog" aria-labelledby="create-trip-title">
      <button className="edit-plan-dismiss" type="button" aria-label="关闭新建行程" onClick={() => setCreateOpen(false)} />
      <form className="edit-plan create-trip-form" onSubmit={(event) => { event.preventDefault(); createTrip(); }}>
        <div><b id="create-trip-title">新建行程</b><button type="button" aria-label="关闭新建行程" onClick={() => setCreateOpen(false)}>×</button></div>
        <label>目的地<input autoFocus placeholder="例如 杭州" required value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value })} /></label>
        <div className="create-trip-dates">
          <label>出发日期<input type="date" required value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value, endDate: event.target.value > draft.endDate ? event.target.value : draft.endDate })} /></label>
          <label>返程日期<input type="date" min={draft.startDate} required value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
        </div>
        <label>同行人（可选）<input placeholder="例如 小林、阿宁" value={draft.companions} onChange={(event) => setDraft({ ...draft, companions: event.target.value })} /></label>
        <div className="edit-plan-actions"><button type="button" onClick={() => setCreateOpen(false)}>取消</button><button type="submit">创建行程</button></div>
      </form>
    </div>}
  </section>;
}