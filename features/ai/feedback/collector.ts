import { normalizeFeedbackEvent, type TravelFeedbackEvent } from "./model";
const key = "travel:feedback-events";
export const MAX_FEEDBACK_EVENTS = 50;
const browserStorage = () => typeof window === "undefined" ? undefined : window.localStorage;
export function readFeedbackEvents(): TravelFeedbackEvent[] { try { const value: unknown = JSON.parse(browserStorage()?.getItem(key) || "[]"); return Array.isArray(value) ? value.map(normalizeFeedbackEvent).filter((event): event is TravelFeedbackEvent => Boolean(event)).slice(-MAX_FEEDBACK_EVENTS) : []; } catch { return []; } }
export function collectFeedbackEvent(event: Omit<TravelFeedbackEvent, "timestamp"> & { timestamp?: string }): TravelFeedbackEvent | undefined { const normalized = normalizeFeedbackEvent({ ...event, timestamp: event.timestamp ?? new Date().toISOString() }); if (!normalized) return undefined; try { browserStorage()?.setItem(key, JSON.stringify([...readFeedbackEvents(), normalized].slice(-MAX_FEEDBACK_EVENTS))); } catch { /* Storage is optional. */ } return normalized; }
