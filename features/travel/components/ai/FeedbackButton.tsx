"use client";

import { collectFeedbackEvent } from "../../../ai/feedback";
import type { TravelFeedbackEvent } from "../../../ai/feedback";

type Props = { event: Omit<TravelFeedbackEvent, "timestamp">; children: string };
export function FeedbackButton({ event, children }: Props) { return <button className="rich-card-feedback" type="button" onClick={() => collectFeedbackEvent(event)}>{children}</button>; }
