import { Button } from "../../shared/components/Button";

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
      <Button disabled={!hasMessages} type="button" variant="secondary" onClick={onExport}>导出</Button>
    </div>
  );
}
