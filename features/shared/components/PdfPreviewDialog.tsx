"use client";

import type { ReactNode } from "react";
import { PdfExportFooter } from "./PdfExportFooter";
import { PdfPreviewHeader } from "./PdfPreviewHeader";
import { useModalBehavior } from "../hooks/useModalBehavior";

type Props = {
  backLabel: string;
  children: ReactNode;
  exporting: boolean;
  onClose: () => void;
  onDownload: () => void;
  title: string;
  titleId: string;
};

/** The complete, shared shell for every PDF export preview. */
export function PdfPreviewDialog({ backLabel, children, exporting, onClose, onDownload, title, titleId }: Props) {
  useModalBehavior(true, onClose);
  return <div aria-labelledby={titleId} aria-modal="true" className="pdf-preview-backdrop" role="dialog">
    <div className="pdf-preview-dialog">
      <PdfPreviewHeader onClose={onClose} title={title} titleId={titleId} />
      <div className="pdf-preview-scroll" data-modal-scroll-lock>{children}</div>
      <PdfExportFooter backLabel={backLabel} exporting={exporting} onBack={onClose} onDownload={onDownload} />
    </div>
  </div>;
}
