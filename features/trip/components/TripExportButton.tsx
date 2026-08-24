"use client";

import { useState } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem, TripDetails } from "../model";
import { TripPdfExport } from "./TripPdfExport";

type Props = {
  budgetItems: ExpenseItem[];
  days: { day: number; date: string }[];
  details: TripDetails;
  expenses: LedgerItem[];
  plans: ItineraryItem[];
};

/** Self-contained trigger and preview workflow for exporting one trip as a PDF. */
export function TripExportButton({ budgetItems, days, details, expenses, plans }: Props) {
  const [open, setOpen] = useState(false);
  return <><button className="settings-trigger" type="button" onClick={() => setOpen(true)}>导出</button><TripPdfExport budgetItems={budgetItems} days={days} details={details} expenses={expenses} onClose={() => setOpen(false)} open={open} plans={plans} /></>;
}
