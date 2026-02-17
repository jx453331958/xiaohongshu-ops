'use client';

import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import antdTheme from '@/theme/antd-theme';

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={antdTheme} locale={zhCN}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
