"use client";

import Link from "next/link";

type QuickNavigationProps = {
  onNavigate: (event: React.MouseEvent<HTMLAnchorElement>, target: string) => void;
};

export function QuickNavigation({ onNavigate }: QuickNavigationProps) {
  return (
    <>
      <aside className="quick-nav" aria-label="快速导航">
        <span className="nav-handle">
          ☰<small>导航</small>
        </span>
        <a href="#top" onClick={(e) => onNavigate(e, "#top")} title="首页">
          <b>⌂</b>
          <span>首页</span>
        </a>
        <a
          href="#service"
          onClick={(e) => onNavigate(e, "#service")}
          title="出行查询"
        >
          <b>⌁</b>
          <span>查询</span>
        </a>
        <a href="#plan" onClick={(e) => onNavigate(e, "#plan")} title="旅行灵感">
          <b>✦</b>
          <span>灵感</span>
        </a>
        <a
          href="#workspace"
          onClick={(e) => onNavigate(e, "#workspace")}
          title="我的行程"
        >
          <b>✎</b>
          <span>行程</span>
        </a>
        <a href="#ai" onClick={(e) => onNavigate(e, "#ai")} title="AI 旅行助手">
          <b>✧</b>
          <span>AI 助手</span>
        </a>
        <a
          href="#top"
          onClick={(e) => onNavigate(e, "#top")}
          className="to-top"
          title="回到顶部"
        >
          <b>↑</b>
        </a>
      </aside>
      <nav className="nav shell">
        <Link className="brand" href="/" title="返回首页">
          <span>✦</span>途遇
        </Link>
        <div className="nav-links">
          <a href="#service" onClick={(e) => onNavigate(e, "#service")}>
            出行服务
          </a>
          <a href="#plan" onClick={(e) => onNavigate(e, "#plan")}>
            旅行灵感
          </a>
          <a href="#workspace" onClick={(e) => onNavigate(e, "#workspace")}>
            我的行程
          </a>
          <a href="#ai" onClick={(e) => onNavigate(e, "#ai")}>
            AI 旅行助手
          </a>
        </div>
        <button className="login" type="button" onClick={() => window.dispatchEvent(new Event("travel:open-auth"))}>登录 / 注册</button>
      </nav>
    </>

  );
}
