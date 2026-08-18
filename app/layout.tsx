import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "途遇 · 旅行服务平台",
  description: "从出发到抵达，途遇陪你规划每一段美好旅程。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
                const y = sessionStorage.getItem('tuyu-scroll-position');
                if (y) scrollTo(0, Number(y));
              } catch {};
            })();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
