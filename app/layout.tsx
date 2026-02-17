import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AntdProvider } from './antd-provider';
import { getAppConfig } from '@/lib/app-config';
import { AppConfigProvider } from '@/components/app-config-provider';
import "./globals.css";

export function generateMetadata(): Metadata {
  const config = getAppConfig();
  return {
    title: `${config.name} - ${config.subtitle}`,
    description: `${config.name}管理系统`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = getAppConfig();

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
            <AppConfigProvider config={config}>
              {children}
            </AppConfigProvider>
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
