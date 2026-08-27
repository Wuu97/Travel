"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { defaultTripDetails } from "../data";
import type { ItineraryItem, TripDetails, TripLibraryItem } from "../model";
import { loadTripDetails, mergeTripLibraryItems, removeTripStorage, saveTrip, saveTripDetails, saveTripLibrary, sortTripLibraryItems } from "../storage";
import { deleteSharedTrip, listAccessibleTrips } from "../api";
import { createId } from "../../shared/utils/createId";
import { getTripDays } from "../utils";
import { CustomDateRangePicker } from "./CustomDateRangePicker";
import { useModalBehavior } from "../../shared/hooks/useModalBehavior";
import { SidebarCollapseButton } from "../../shared/components/SidebarCollapseButton";
import { SidebarHeader } from "../../shared/components/SidebarHeader";
import { ScrollArea } from "../../shared/components/ScrollArea";
import { useConfirmation } from "../../shared/components/ConfirmDialog";
import { TripSidebarIcon } from "./TripSidebarIcon";
import { writeHistoryIfChanged } from "../../navigation/history";
import { selectTripFromLibrary } from "../librarySelection";

const newTripId = () => createId("trip");

type TripDraft = { destination: string; startDate: string; endDate: string; companions: string };

const defaultTripDraft = (): TripDraft => ({
  destination: "",
  startDate: "",
  endDate: "",
  companions: "",
});

type Props = {
  accessToken: string | null;
  activeTripId: string;
  activeDay: number;
  collapsed?: boolean;
  currentDetails: TripDetails;
  plans: ItineraryItem[];
  onActiveTripChange: (tripId: string | null) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onMovePlan: (id: string, day: number) => void;
  onSelectDay: (day: number) => void;
  storageScope: string;
  initialItems: TripLibraryItem[];
  cloudDeleteCapabilities: Map<string, boolean>;
  initialError: string | null;
  libraryReady: boolean;
};

export function TripLibrary({ accessToken, activeDay, activeTripId: committedActiveTripId, cloudDeleteCapabilities: initialCloudDeleteCapabilities, collapsed = false, currentDetails, initialError, initialItems, libraryReady: committedLibraryReady, onActiveTripChange, onCollapsedChange, onMovePlan, onSelectDay, plans, storageScope }: Props) {
  const [items, setItems] = useState<TripLibraryItem[]>([]);
  const itemsRef = useRef<TripLibraryItem[]>([]);
  const [cloudDeleteCapabilities, setCloudDeleteCapabilities] = useState<Map<string, boolean>>(() => initialCloudDeleteCapabilities);
  const [cloudListError, setCloudListError] = useState<string | null>(null);
  const [cloudListRetrying, setCloudListRetrying] = useState(false);
  const cloudListLoadingRef = useRef(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TripDraft>(defaultTripDraft);
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof TripDraft, string>>>({});
  const { confirm } = useConfirmation();
  const [openGroups, setOpenGroups] = useState<Record<TripDetails["status"], boolean>>({
    "进行中": true,
    "筹备中": true,
    "已结束": true,
  });
  const [expandedTrips, setExpandedTrips] = useState<Record<string, boolean>>({});

  useLayoutEffect(() => {
    if (!committedLibraryReady) return;
    itemsRef.current = initialItems;
    setItems(initialItems);
    setCloudDeleteCapabilities(initialCloudDeleteCapabilities);
    setCloudListError(initialError);
  }, [committedLibraryReady, initialCloudDeleteCapabilities, initialError, initialItems]);

  const loadCloudTrips = useCallback(async () => {
    if (!accessToken || cloudListLoadingRef.current) return;
    cloudListLoadingRef.current = true;
    setCloudListRetrying(true);
    try {
      const cloudItems = await listAccessibleTrips(accessToken);
      setCloudDeleteCapabilities(new Map(cloudItems.map((item) => [item.id, item.canDelete === true])));
      const mergedItems = mergeTripLibraryItems(itemsRef.current, cloudItems);
      itemsRef.current = mergedItems;
      setItems(mergedItems);
      if (cloudItems.length) saveTripLibrary(mergedItems, storageScope);
      // A cloud refresh must not steal the user's current selection. The only
      // time discovery chooses an active trip is when no selection exists yet.
      const currentActiveTripId = committedActiveTripId;
      const selectedTripId = currentActiveTripId && mergedItems.some((item) => item.id === currentActiveTripId)
        ? currentActiveTripId
        : selectTripFromLibrary(mergedItems, new URLSearchParams(window.location.search).get("trip")).selectedTripId;
      if (selectedTripId !== currentActiveTripId) {
        onActiveTripChange(selectedTripId);
      }
      setCloudListError(null);
    } catch {
      // Keep the current local/merged list and selection untouched.
      setCloudDeleteCapabilities(new Map());
      setCloudListError("云端旅行暂时无法加载，当前显示本地数据。");
    } finally {
      cloudListLoadingRef.current = false;
      setCloudListRetrying(false);
    }
  }, [accessToken, committedActiveTripId, onActiveTripChange, storageScope]);

  useEffect(() => {
    const markRemoteTrip = (event: Event) => {
      const tripId = (event as CustomEvent<string>).detail;
      if (typeof tripId !== "string") return;
      setItems((current) => {
        const next = current.map((item) => item.id === tripId ? { ...item, cloudBacked: true, canDelete: undefined } : item);
        itemsRef.current = next;
        return next;
      });
    };
    window.addEventListener("tuyu-tripremote", markRemoteTrip);
    return () => window.removeEventListener("tuyu-tripremote", markRemoteTrip);
  }, []);

  useEffect(() => {
    const openCreate = () => setCreateOpen(true);
    window.addEventListener("tuyu-tripcreateopen", openCreate);
    return () => window.removeEventListener("tuyu-tripcreateopen", openCreate);
  }, []);

  useEffect(() => {
    const addCreatedTrip = (event: Event) => {
      const item = (event as CustomEvent<TripLibraryItem>).detail;
      if (!item || typeof item.id !== "string") return;
      setItems((current) => {
        const next = current.some((trip) => trip.id === item.id) ? current : [...current, item];
        itemsRef.current = next;
        return next;
      });
      onActiveTripChange(item.id);
    };
    window.addEventListener("tuyu-tripcreated", addCreatedTrip);
    return () => window.removeEventListener("tuyu-tripcreated", addCreatedTrip);
  }, [onActiveTripChange]);

  const retryCloudList = () => {
    if (!accessToken || cloudListRetrying) return;
    void loadCloudTrips();
  };

  const openTrip = (tripId: string, day = 1) => {
    if (tripId === committedActiveTripId) {
      const url = new URL(window.location.href);
      // Hydration may restore an active trip without changing the URL. This is
      // the first user navigation, so make the resulting deep link explicit.
      url.searchParams.set("trip", tripId);
      url.searchParams.set("day", String(day));
      writeHistoryIfChanged("replace", url, "select-day");
      onSelectDay(day);
      return;
    }
    // Selection is application state; commit it before updating browser
    // history. This keeps the sidebar, active details, and selected day in one
    // React update instead of exposing a URL/history intermediate frame.
    onSelectDay(day);
    onActiveTripChange(tripId);
    const url = new URL(window.location.href);
    url.searchParams.set("trip", tripId);
    url.searchParams.set("day", String(day));
    sessionStorage.setItem("tuyu-scroll-position", String(window.scrollY));
    if (writeHistoryIfChanged("push", url, "select-trip")) window.dispatchEvent(new Event("tuyu-tripchange"));
  };

  const createTrip = () => {
    const destination = draft.destination.trim();
    const errors: Partial<Record<keyof TripDraft, string>> = {};
    if (!destination) errors.destination = "请填写目的地";
    if (!draft.startDate) errors.startDate = "请选择出发日期";
    if (!draft.endDate) errors.endDate = "请选择返程日期";
    else if (draft.startDate && draft.endDate < draft.startDate) errors.endDate = "返程日期不能早于出发日期";
    if (Object.keys(errors).length) { setCreateErrors(errors); return; }
    const id = newTripId();
    const companions = ["你", ...draft.companions.split(/[,，]/).map((name) => name.trim()).filter(Boolean)];
    const uniqueCompanions = [...new Set(companions)];
    const details: TripDetails = { ...defaultTripDetails, title: destination, startDate: draft.startDate, endDate: draft.endDate, status: "筹备中", companions: uniqueCompanions, memberRoles: Object.fromEntries(uniqueCompanions.filter((name) => name !== "你").map((name) => [name, "同行人"])) };
    const nextItems = sortTripLibraryItems([...items, { id, title: details.title, startDate: details.startDate, endDate: details.endDate, status: details.status }]);
    saveTrip({ expenses: [], budgetItems: [], plans: [] }, id, storageScope);
    saveTripDetails(details, id, storageScope);
    saveTripLibrary(nextItems, storageScope);
    itemsRef.current = nextItems;
    setItems(nextItems);
    setCreateOpen(false);
    setDraft(defaultTripDraft());
    setCreateErrors({});
    openTrip(id);
  };

  const closeCreateTrip = () => {
    setCreateOpen(false);
    setDraft(defaultTripDraft());
    setCreateErrors({});
  };
  useModalBehavior(createOpen, closeCreateTrip);

  /* Legacy picker implementation retained temporarily for diff readability; all live date inputs use CustomDateRangePicker. */
  /* const openCalendar = (target: "start" | "end", month = target === "start" ? draft.startDate : draft.endDate || draft.startDate) => {
    setCalendarMonth((month || formatDate(new Date())).slice(0, 7));
    setCalendarView("days");
    setCalendarTarget(target);
  };

  const moveCalendarMonth = (offset: number) => {
    const date = toLocalDate(`${calendarMonth}-01`);
    date.setMonth(date.getMonth() + offset);
    setCalendarMonth(formatDate(date).slice(0, 7));
  };

  const renderDateCalendar = (target: "start" | "end") => {
    if (calendarTarget !== target) return null;
    const [year, month] = calendarMonth.split("-").map(Number);
    const choose = (value: string) => {
      if (target === "start") {
        const shouldChooseEnd = !draft.endDate || value > draft.endDate;
        setDraft({ ...draft, startDate: value, endDate: shouldChooseEnd && draft.endDate ? value : draft.endDate });
        setCalendarMonth(value.slice(0, 7));
        setCalendarView("days");
        setCalendarTarget(shouldChooseEnd ? "end" : null);
        return;
      }
      setDraft({ ...draft, endDate: value });
      setCalendarTarget(null);
    };
    const [startYear, startMonth] = draft.startDate ? draft.startDate.slice(0, 7).split("-").map(Number) : [0, 0];
    const today = formatDate(new Date());
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    return <div className="return-date-calendar" role="dialog" aria-label={`选择${target === "start" ? "出发" : "返程"}日期`} onClick={(event) => event.stopPropagation()}><div className="calendar-toolbar"><button type="button" aria-label="上个月" onClick={() => moveCalendarMonth(-1)}>‹</button><div><button type="button" onClick={() => setCalendarView("years")}>{year} 年</button><button type="button" onClick={() => setCalendarView("months")}>{month} 月</button></div><button type="button" aria-label="下个月" onClick={() => moveCalendarMonth(1)}>›</button><button className="calendar-today" type="button" onClick={() => { setCalendarMonth(today.slice(0, 7)); setCalendarView("days"); }}>今天</button></div>{calendarView === "days" ? <><div className="return-calendar-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div><div className="return-calendar-days">{calendarDays(calendarMonth).map((date) => { const value = formatDate(date); const marker = holidayMarkers[value]; const isWeekend = !marker && value.slice(0, 7) === calendarMonth && (date.getDay() === 0 || date.getDay() === 6); const disabled = Boolean(target === "end" && draft.startDate && value < draft.startDate); const markerLabel = marker?.kind === "work" ? "班" : marker?.label; return <button className={`${value.slice(0, 7) !== calendarMonth ? "outside-month " : ""}${value === (target === "start" ? draft.startDate : draft.endDate) ? "selected" : ""}${value === today ? " today" : ""}${marker ? ` holiday-${marker.kind}` : ""}${isWeekend ? " weekend" : ""}`} disabled={disabled} key={value} title={markerLabel || undefined} type="button" onClick={() => choose(value)}>{markerLabel && <span className="calendar-holiday-marker" aria-hidden="true">{markerLabel}</span>}<span>{date.getDate()}</span></button>; })}</div></> : calendarView === "months" ? <div className="calendar-choice-grid">{Array.from({ length: 12 }, (_, index) => { const value = index + 1; const disabled = target === "end" && Boolean(draft.startDate) && (year < startYear || (year === startYear && value < startMonth)); return <button className={value === month ? "selected" : ""} disabled={disabled} key={index} type="button" onClick={() => { setCalendarMonth(`${year}-${String(value).padStart(2, "0")}`); setCalendarView("days"); }}>{value} 月</button>; })}</div> : <div className="calendar-choice-grid">{Array.from({ length: 12 }, (_, index) => { const value = year - 5 + index; const disabled = target === "end" && Boolean(draft.startDate) && value < startYear; return <button className={value === year ? "selected" : ""} disabled={disabled} key={value} type="button" onClick={() => { setCalendarMonth(`${value}-${String(month).padStart(2, "0")}`); setCalendarView("days"); }}>{value} 年</button>; })}</div>}</div>;
  }; */

  const deleteTrip = async (tripId: string) => {
    const trip = items.find((item) => item.id === tripId);
    if (!trip || deletingTripId) return;
    const cloudCapability = cloudDeleteCapabilities.get(tripId);
    const cloudBacked = Boolean(accessToken) && (trip.cloudBacked === true || cloudCapability !== undefined);
    if (cloudBacked && cloudCapability !== true) return;
    if (!await confirm({ title: "删除行程？", description: `“${trip.title}”及其全部行程数据将被永久删除，且无法恢复。` })) return;
    setDeleteError(null);
    setDeletingTripId(tripId);
    window.dispatchEvent(new CustomEvent("tuyu-tripdelete", { detail: tripId }));
    try {
      // Only trips discovered in cloud (or successfully read from a remote
      // snapshot) require the authoritative DELETE before local cleanup.
      if (cloudBacked && accessToken) await deleteSharedTrip(tripId, accessToken);
    } catch (error) {
      window.dispatchEvent(new CustomEvent("tuyu-tripdeletecancel", { detail: tripId }));
      setDeleteError(error instanceof Error ? error.message : "删除云端行程失败，请重试。");
      setDeletingTripId(null);
      return;
    }
    const nextItems = items.filter((item) => item.id !== tripId);
    removeTripStorage(tripId, storageScope);
    saveTripLibrary(nextItems, storageScope);
    itemsRef.current = nextItems;
    setItems(nextItems);
    if (tripId === committedActiveTripId) {
      if (nextItems[0]) openTrip(nextItems[0].id);
      else {
        onActiveTripChange(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("trip");
        url.searchParams.delete("day");
        if (writeHistoryIfChanged("replace", url, "delete-last-trip")) window.dispatchEvent(new Event("tuyu-tripchange"));
      }
    }
    setDeletingTripId(null);
  };

  const groups: Array<{ label: string; status: TripDetails["status"] }> = [
    { label: "进行中", status: "进行中" },
    { label: "筹备中", status: "筹备中" },
    { label: "已结束", status: "已结束" },
  ];

  const showLibrary = committedLibraryReady;

  return <section className={`trip-library trip-sidebar ${collapsed ? "is-collapsed" : ""}`} aria-busy={!showLibrary} aria-label="全部行程">
    <SidebarHeader action={<button aria-label="新建行程" className="sidebar-header-action" title="新建行程" type="button" onClick={() => setCreateOpen(true)}>＋ 新建</button>} className="trip-sidebar-heading" collapseButton={<SidebarCollapseButton className="sidebar-header-collapse" collapseLabel="收起行程侧栏" collapsed={collapsed} expandLabel="展开行程侧栏" onToggle={() => onCollapsedChange?.(!collapsed)} />} title="全部行程" />
    <div className="trip-sidebar-groups">
      {!showLibrary ? null : <>
      {cloudListError && <p className="sync-error" role="status">{cloudListError}<button type="button" disabled={cloudListRetrying} onClick={retryCloudList}>{cloudListRetrying ? "正在重试" : "重试"}</button></p>}
      {deleteError && <p className="sync-error" role="status">{deleteError}</p>}
      {!items.length && <p className="trip-library-empty" role="status">还没有旅行，创建你的第一段旅程吧。</p>}
      {groups.map(({ label, status }) => {
        // A library group is defined by the committed library item only.  The
        // workspace details hydrate on a different schedule; using their
        // transient fallback here made the active trip jump between groups.
        const groupItems = items.filter((item) => (item.status || "筹备中") === status);
        const isOpen = openGroups[status];
        const icon = status === "进行中" ? "calendar" : status === "筹备中" ? "clock" : "check";
        return <section className="trip-sidebar-group" key={status}>
          <button className={`trip-sidebar-group-toggle${isOpen ? " is-open" : ""}`} type="button" aria-expanded={isOpen} onClick={() => setOpenGroups((current) => ({ ...current, [status]: !current[status] }))}><TripSidebarIcon name={icon} /><b>{label}</b><small>{groupItems.length}</small><svg aria-hidden="true" className="sidebar-chevron" viewBox="0 0 12 12"><path d="m1 3 5 6 5-6" /></svg></button>
          {isOpen && <div className="trip-library-list">
            {groupItems.map((item) => {
              const isActive = item.id === committedActiveTripId;
              const details = isActive ? currentDetails : loadTripDetails(defaultTripDetails, item.id, storageScope);
              const days = getTripDays(details.startDate, details.endDate);
              const isExpanded = expandedTrips[item.id] ?? isActive;
              const pendingPlans = isActive ? plans.filter((plan) => plan.day === 0) : [];
              const cloudCapability = cloudDeleteCapabilities.get(item.id);
              const cloudBacked = Boolean(accessToken) && (item.cloudBacked === true || cloudCapability !== undefined);
              const canDeleteItem = !cloudBacked || cloudCapability === true;
              return <div className={`trip-library-item ${isActive ? "selected" : ""}`} key={item.id}>
                <div className="trip-library-trip-row">
                  <button className="trip-library-open" type="button" title={item.title} onClick={() => openTrip(item.id)}><TripSidebarIcon name="mountain" /><span><b>{item.title}</b><small>{item.startDate} - {item.endDate}</small></span></button>
                  {canDeleteItem && <button aria-label={`删除${item.title}`} className="trip-library-delete" disabled={deletingTripId !== null} title={deletingTripId === item.id ? "正在删除" : "删除行程"} type="button" onClick={() => void deleteTrip(item.id)}>{deletingTripId === item.id ? "…" : "×"}</button>}
                  <button className={`trip-library-tree-toggle${isExpanded ? " is-open" : ""}`} type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? "收起" : "展开"}${item.title}的天数`} onClick={() => setExpandedTrips((current) => ({ ...current, [item.id]: !isExpanded }))}><svg aria-hidden="true" className="sidebar-chevron" viewBox="0 0 12 12"><path d="m1 3 5 6 5-6" /></svg></button>
                </div>
                {isExpanded && <ScrollArea ariaLabel={`${item.title} 的天数`} className="trip-library-days">
                  {days.map((day) => <button className={isActive && activeDay === day.day ? "selected-day" : ""} key={day.day} type="button" onClick={() => openTrip(item.id, day.day)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("application/x-tuyu-itinerary"); if (id && isActive) onMovePlan(id, day.day); }}><i aria-hidden="true" className="day-timeline-dot" /><b>DAY {day.day}</b><span>{day.date}</span></button>)}
                  <button className={`pending-day${isActive && activeDay === 0 ? " selected-day" : ""}`} type="button" onClick={() => openTrip(item.id, 0)}><i aria-hidden="true" className="day-timeline-dot" /><b>待定行程</b><span>{pendingPlans.length ? `${pendingPlans.length} 项` : "暂无安排"}</span></button>
                </ScrollArea>}
              </div>;
            })}
          </div>}
        </section>;
      })}</>}
    </div>
    {createOpen && <div aria-modal="true" className="edit-plan-backdrop" role="dialog" aria-labelledby="create-trip-title">
      <button className="edit-plan-dismiss" type="button" aria-label="关闭新建行程" onClick={closeCreateTrip} />
      <form className="edit-plan create-trip-form" noValidate onSubmit={(event) => { event.preventDefault(); createTrip(); }}>
        <div><b id="create-trip-title">新建行程</b><button type="button" aria-label="关闭新建行程" onClick={closeCreateTrip}>×</button></div>
        <label>目的地<input className={createErrors.destination ? "input-error" : ""} placeholder="例如 杭州" value={draft.destination} onChange={(event) => { setDraft({ ...draft, destination: event.target.value }); if (createErrors.destination) setCreateErrors({ ...createErrors, destination: undefined }); }} />{createErrors.destination && <small className="field-error">{createErrors.destination}</small>}</label>
        <CustomDateRangePicker className="create-trip-dates" endDate={draft.endDate} endError={createErrors.endDate} endLabel="返程日期" onChange={(dates) => { setDraft({ ...draft, ...dates }); setCreateErrors({ ...createErrors, startDate: dates.startDate ? undefined : createErrors.startDate, endDate: dates.endDate ? undefined : createErrors.endDate }); }} startDate={draft.startDate} startError={createErrors.startDate} startLabel="出发日期" />
        <label>同行人（可选）<input placeholder="例如 小林、阿宁" value={draft.companions} onChange={(event) => setDraft({ ...draft, companions: event.target.value })} /></label>
        <div className="edit-plan-actions"><button type="button" onClick={closeCreateTrip}>取消</button><button type="submit">创建</button></div>
      </form>
    </div>}
  </section>;
}
