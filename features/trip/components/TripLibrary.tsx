"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { defaultTripDetails, getDefaultStoredTrip } from "../data";
import type { TripDetails, TripLibraryItem } from "../model";
import { loadTripDetails, loadTripLibrary, removeTripStorage, saveTrip, saveTripDetails, saveTripLibrary } from "../storage";
import { createId } from "../../shared/utils/createId";
import { getTripDays } from "../utils";

const defaultLibraryTrip: TripLibraryItem = {
  id: "hangzhou-summer-trip",
  title: defaultTripDetails.title,
  startDate: defaultTripDetails.startDate,
  endDate: defaultTripDetails.endDate,
  status: defaultTripDetails.status,
};

const newTripId = () => createId("trip");
const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

type TripDraft = { destination: string; startDate: string; endDate: string; companions: string };

const defaultTripDraft = (): TripDraft => ({
  destination: "",
  startDate: "",
  endDate: "",
  companions: "",
});

type Props = {
  activeDay: number;
  collapsed?: boolean;
  currentDetails: TripDetails;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelectDay: (day: number) => void;
};

export function TripLibrary({ activeDay, collapsed = false, currentDetails, onCollapsedChange, onSelectDay }: Props) {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientHydrationState, getServerHydrationState);
  const [activeTripId, setActiveTripId] = useState(defaultLibraryTrip.id);
  const [items, setItems] = useState<TripLibraryItem[]>([defaultLibraryTrip]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TripDraft>(defaultTripDraft);
  const [openGroups, setOpenGroups] = useState<Record<TripDetails["status"], boolean>>({
    "进行中": true,
    "筹备中": true,
    "已结束": true,
  });
  const [expandedTrips, setExpandedTrips] = useState<Record<string, boolean>>({
    [defaultLibraryTrip.id]: true,
  });

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      setActiveTripId(new URLSearchParams(window.location.search).get("trip") || defaultLibraryTrip.id);
      const loadedItems = loadTripLibrary(defaultLibraryTrip).map((item) => ({ ...item, status: loadTripDetails(defaultTripDetails, item.id).status }));
      setItems(loadedItems);
      saveTripLibrary(loadedItems);
      setLibraryLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !libraryLoaded) return;
    const timer = window.setTimeout(() => setItems((current) => {
      const currentItem = { id: activeTripId, title: currentDetails.title, startDate: currentDetails.startDate, endDate: currentDetails.endDate, status: currentDetails.status };
      const next = current.some((item) => item.id === activeTripId)
        ? current.map((item) => item.id === activeTripId ? { ...item, ...currentItem } : item)
        : [...current, currentItem];
      if (next.length !== current.length || next.some((item, index) => item !== current[index])) saveTripLibrary(next);
      return next;
    }), 0);
    return () => window.clearTimeout(timer);
  }, [activeTripId, currentDetails.endDate, currentDetails.startDate, currentDetails.status, currentDetails.title, hydrated, libraryLoaded]);

  const openTrip = (tripId: string, day = 1) => {
    if (tripId === activeTripId) {
      const url = new URL(window.location.href);
      url.searchParams.set("day", String(day));
      window.history.replaceState(null, "", url);
      onSelectDay(day);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("trip", tripId);
    url.searchParams.set("day", String(day));
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

  const groups: Array<{ label: string; status: TripDetails["status"] }> = [
    { label: "进行中", status: "进行中" },
    { label: "筹备中", status: "筹备中" },
    { label: "已结束", status: "已结束" },
  ];

  return <section className={`trip-library trip-sidebar ${collapsed ? "is-collapsed" : ""}`} aria-label="全部行程">
    <div className="trip-sidebar-heading">
      <button className="trip-sidebar-collapse" type="button" aria-label={collapsed ? "展开行程侧栏" : "收起行程侧栏"} title={collapsed ? "展开侧栏" : "收起侧栏"} onClick={() => onCollapsedChange?.(!collapsed)}>☰</button>
      <span>全部行程</span>
      <button className="trip-sidebar-create" type="button" aria-label="新建行程" title="新建行程" onClick={() => setCreateOpen(true)}>＋</button>
    </div>
    <div className="trip-sidebar-groups">
      {groups.map(({ label, status }) => {
        const groupItems = items.filter((item) => (item.id === activeTripId ? currentDetails.status : item.status || "筹备中") === status);
        const isOpen = openGroups[status];
        return <section className="trip-sidebar-group" key={status}>
          <button className="trip-sidebar-group-toggle" type="button" aria-expanded={isOpen} onClick={() => setOpenGroups((current) => ({ ...current, [status]: !current[status] }))}><span aria-hidden="true">{isOpen ? "⌄" : "›"}</span><b>{label}</b><small>{groupItems.length}</small></button>
          {isOpen && <div className="trip-library-list">
            {groupItems.map((item) => {
              const isActive = item.id === activeTripId;
              const details = isActive ? currentDetails : loadTripDetails(defaultTripDetails, item.id);
              const days = getTripDays(details.startDate, details.endDate);
              const isExpanded = expandedTrips[item.id] ?? isActive;
              return <div className={`trip-library-item ${isActive ? "selected" : ""}`} key={item.id}>
                <div className="trip-library-trip-row">
                  <button className="trip-library-tree-toggle" type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? "收起" : "展开"}${item.title}的天数`} onClick={() => setExpandedTrips((current) => ({ ...current, [item.id]: !isExpanded }))}>{isExpanded ? "⌄" : "›"}</button>
                  <button className="trip-library-open" type="button" title={item.title} onClick={() => openTrip(item.id)}><b>{item.title}</b><small>{item.startDate} - {item.endDate}</small></button>
                </div>
                {isExpanded && <div className="trip-library-days" aria-label={`${item.title} 的天数`}>
                  {days.map((day) => <button className={isActive && activeDay === day.day ? "selected-day" : ""} key={day.day} type="button" onClick={() => openTrip(item.id, day.day)}><b>DAY {day.day}</b><span>{day.date}</span></button>)}
                </div>}
                <button aria-label={`删除${item.title}`} className="trip-library-delete" title="删除行程" type="button" onClick={() => deleteTrip(item.id)}>×</button>
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
    {createOpen && <div aria-modal="true" className="edit-plan-backdrop" role="dialog" aria-labelledby="create-trip-title">
      <button className="edit-plan-dismiss" type="button" aria-label="关闭新建行程" onClick={() => setCreateOpen(false)} />
      <form className="edit-plan create-trip-form" onSubmit={(event) => { event.preventDefault(); createTrip(); }}>
        <div><b id="create-trip-title">新建行程</b><button type="button" aria-label="关闭新建行程" onClick={() => setCreateOpen(false)}>×</button></div>
        <label>目的地<input placeholder="例如 杭州" required value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value })} /></label>
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
