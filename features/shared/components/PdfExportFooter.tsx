type Props = {
  backLabel: string;
  exporting: boolean;
  onBack: () => void;
  onDownload: () => void;
};

/** Shared actions for every PDF export preview. */
export function PdfExportFooter({ backLabel, exporting, onBack, onDownload }: Props) {
  const actionStyle = { boxSizing: "border-box" as const, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 88, height: 34, padding: 0 };

  return <footer className="pdf-export-footer">
    <button style={actionStyle} type="button" onClick={onBack}>{backLabel}</button>
    <button className="pdf-download" disabled={exporting} style={actionStyle} type="button" onClick={onDownload}>{exporting ? "正在生成…" : "下载 PDF"}</button>
  </footer>;
}
