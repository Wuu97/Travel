import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../model";
import { Button } from "../../shared/components/Button";

type Props = {
  busy: boolean;
  messages: ChatMessage[];
  onRetryVerifiedData: () => void;
  renderImports: (message: ChatMessage) => React.ReactNode;
};

export function ChatMessageList({ busy, messages, onRetryVerifiedData, renderImports }: Props) {
  return (
    <>
      {!messages.length && <div className="bubble assistant-bubble">你好呀！下一段旅程想去哪里？我可以帮你从灵感开始规划。<span>09:41</span></div>}
      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`} className={`bubble ${message.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
          {message.role === "assistant" ? <><div className="rich-message"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>{message.verifiedDataUnavailable && <p className="memory-state memory-error" role="status">实时地点数据暂不可用 <Button disabled={busy} type="button" variant="link" onClick={onRetryVerifiedData}>重试实时数据</Button></p>}{renderImports(message)}</> : message.content}
        </div>
      ))}
      {busy && <div className="bubble assistant-bubble">正在思考…</div>}
    </>
  );
}
