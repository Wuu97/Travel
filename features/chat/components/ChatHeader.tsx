type Props = {
  hasMessages: boolean;
  onExport: () => void;
  provider: string;
};

export function ChatHeader({ hasMessages, onExport, provider }: Props) {
  return (
    <div className="chat-top">
      <span className="ai-dot">✦</span>
      <div><b>途遇 AI</b><small>由 {provider} 驱动</small></div>
      <i>在线</i>
      <button className="history-button" onClick={onExport} disabled={!hasMessages}>导出</button>
    </div>
  );
}
