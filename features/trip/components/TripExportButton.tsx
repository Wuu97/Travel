"use client";

import { useState } from "react";
import { Button } from "../../shared/components/Button";
import type { ExpenseItem, ItineraryItem, LedgerItem, TripDetails } from "../model";
import { TripPdfExport } from "./TripPdfExport";

type Props = {
  budgetItems: ExpenseItem[];
  days: { day: number; date: string }[];
  details: TripDetails;
  expenses: LedgerItem[];
  plans: ItineraryItem[];
  totalBudget: number | null;
};

/** Self-contained trigger and preview workflow for exporting one trip as a PDF. */
export function TripExportButton({ budgetItems, days, details, expenses, plans, totalBudget }: Props) {
  const [open, setOpen] = useState(false);
  return <><Button type="button" variant="secondary" onClick={() => setOpen(true)}>导出</Button><TripPdfExport budgetItems={budgetItems} days={days} details={details} expenses={expenses} onClose={() => setOpen(false)} open={open} plans={plans} totalBudget={totalBudget} /></>;
}
