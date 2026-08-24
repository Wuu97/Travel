"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PdfPreviewDialog } from "../../shared/components/PdfPreviewDialog";
import type { ChatMessage } from "../model";

type Props = { messages: ChatMessage[]; onClose: () => void; open: boolean; title: string };

/** Uses the same preview-first PDF workflow as the trip export. */
export function ChatPdfExport({ messages, onClose, open, title }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  if (!open) return null;

  const download = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(previewRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const pdf = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imageHeight = canvas.height * pageWidth / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, imageHeight);
      pdf.save(`${title.replace(/[\\/:*?"<>|]/g, "-")}-AI对话.pdf`);
    } finally { setExporting(false); }
  };

  return <PdfPreviewDialog backLabel="返回对话" exporting={exporting} onClose={onClose} onDownload={() => void download()} title="确认对话排版" titleId="chat-pdf-title"><article className="pdf-document chat-pdf-document" ref={previewRef}><header className="pdf-document-header"><p>AI CHAT</p><h1>{title}</h1><span>途遇 AI 对话记录</span></header><section className="chat-pdf-messages">{messages.map((message, index) => <article className={message.role === "user" ? "user" : "assistant"} key={`${message.role}-${index}`}><b>{message.role === "user" ? "我" : "途遇 AI"}</b><div className="chat-pdf-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div></article>)}</section></article></PdfPreviewDialog>;
}
