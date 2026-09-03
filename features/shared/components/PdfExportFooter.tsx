type Props = {
  backLabel: string;
  exporting: boolean;
  onBack: () => void;
  onDownload: () => void;
};

/** Shared actions for every PDF export preview. */
export function PdfExportFooter({ backLabel, exporting, onBack, onDownload }: Props) {
  return <footer className="pdf-export-footer">
    <Button type="button" variant="secondary" onClick={onBack}>{backLabel}</Button>
    <Button loading={exporting} type="button" onClick={onDownload}>下载 PDF</Button>
  </footer>;
}
import { Button } from "./Button";
