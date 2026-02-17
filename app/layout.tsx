import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AntdProvider } from './antd-provider';
import { appConfig } from '@/lib/app-config';
import "./globals.css";

export const metadata: Metadata = {
  title: `${appConfig.name} - ${appConfig.subtitle}`,
  description: `${appConfig.name}管理系统`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300&family=Outfit:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AntdRegistry>
          <AntdProvider>
            {children}
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
