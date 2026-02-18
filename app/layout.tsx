import type { Metadata, Viewport } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AntdProvider } from './antd-provider';
import { getAppConfig } from '@/lib/app-config';
import { AppConfigProvider } from '@/components/app-config-provider';
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

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
      <head />
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
