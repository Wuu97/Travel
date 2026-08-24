type Props = {
  onClose: () => void;
  title: string;
  titleId: string;
};

/** Shared title bar and close control for every PDF preview dialog. */
export function PdfPreviewHeader({ onClose, title, titleId }: Props) {
  return <header className="pdf-preview-header">
    <div><p>PDF EXPORT PREVIEW</p><h2 id={titleId}>{title}</h2></div>
    <button aria-label="关闭 PDF 预览" className="pdf-preview-close" type="button" onClick={onClose}>×</button>
  </header>;
}
