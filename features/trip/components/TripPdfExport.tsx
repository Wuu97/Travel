"use client";

import { useRef, useState } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem, TripDetails } from "../model";
import { getBudgetVsActual } from "../budgetRules";
import { typeColors } from "../utils";
import { PdfPreviewDialog } from "../../shared/components/PdfPreviewDialog";

type Props = { budgetItems: ExpenseItem[]; days: Array<{ day: number; date: string }>; details: TripDetails; expenses: LedgerItem[]; onClose: () => void; open: boolean; plans: ItineraryItem[]; totalBudget: number | null };

const money = (amount: number) => `¥${amount.toFixed(0)}`;

/** Preview-first PDF export that avoids the browser print dialog. */
export function TripPdfExport({ budgetItems, days, details, expenses, onClose, open, plans, totalBudget }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const overview = getBudgetVsActual(totalBudget, budgetItems, expenses);

  if (!open) return null;

  const download = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const pdf = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
      const pages = [...previewRef.current.querySelectorAll<HTMLElement>(".pdf-document")];
      let isFirstPage = true;
      for (const page of pages) {
        const canvas = await html2canvas(page, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
        const pageWidth = 210;
        const pageHeight = 297;
        const imageHeight = (canvas.height * pageWidth) / canvas.width;
        let offset = 0;
        while (offset < imageHeight) {
          if (!isFirstPage) pdf.addPage();
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, -offset, pageWidth, imageHeight);
          offset += pageHeight;
          isFirstPage = false;
        }
      }
      pdf.save(`${details.title.replace(/[\\/:*?"<>|]/g, "-")}-行程.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return <PdfPreviewDialog backLabel="返回编辑" exporting={exporting} onClose={onClose} onDownload={() => void download()} title="确认行程排版" titleId="pdf-preview-title"><div className="pdf-preview-pages" ref={previewRef}><div className="pdf-document">
        <header className="pdf-document-header"><p>{details.status}</p><h1>{details.title}</h1><span>{details.startDate.replaceAll("-", ".")} - {details.endDate.replaceAll("-", ".")} · {details.companions.length} 位同行人</span></header>
        <section><h2>攻略</h2>{days.map((day) => { const items = plans.filter((plan) => (plan.day || 1) === day.day); return <article className="pdf-day" key={day.day}><h3>DAY {day.day}<small>{day.date.replaceAll("-", ".")}</small></h3>{items.length ? <ol>{items.map((plan) => <li key={plan.id}><time>{plan.time || "待定"}</time><div><strong>{plan.title}</strong><span style={{ color: typeColors[plan.type].color, background: typeColors[plan.type].tint }}>{plan.type}</span>{plan.note && <p>{plan.note}</p>}</div></li>)}</ol> : <p className="pdf-empty">暂无安排</p>}</article>; })}</section>
      </div><div className="pdf-document pdf-budget"><header className="pdf-document-header"><p>TRIP BUDGET</p><h1>{details.title}</h1><span>费用概览与预算汇总</span></header><section><h2>账本</h2><div className="pdf-totals"><div><span>总预算</span><strong>{overview.totalBudget === null ? "未设置" : money(overview.totalBudget)}</strong></div><div><span>预计支出</span><strong>{money(overview.estimatedTotal)}</strong></div><div><span>已支出</span><strong>{money(overview.actualTotal)}</strong></div></div></section></div></div></PdfPreviewDialog>;
}
