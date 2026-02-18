import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const antdTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    fontSize: 16,
    colorPrimary: '#FF2442',
    colorBgContainer: '#1a1625',
    colorBgLayout: '#0f0d15',
    colorBgElevated: '#2d2839',
    colorBgBase: '#0f0d15',
    colorBorder: 'rgba(212, 165, 116, 0.2)',
    colorBorderSecondary: 'rgba(212, 165, 116, 0.12)',
    colorText: '#F5F3F7',
    colorTextSecondary: '#B4A9C3',
    colorTextTertiary: '#7A6F8A',
    colorTextQuaternary: '#5a5068',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    borderRadius: 8,
    colorLink: '#FF2442',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#DC2626',
    colorInfo: '#3B82F6',
  },
  components: {
    Layout: {
      siderBg: '#1a1625',
      headerBg: '#1a1625',
      bodyBg: '#0f0d15',
      triggerBg: '#252032',
    },
    Menu: {
      darkItemBg: '#1a1625',
      darkItemSelectedBg: 'rgba(255, 36, 66, 0.15)',
      darkItemSelectedColor: '#FF2442',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      darkItemColor: '#B4A9C3',
      darkSubMenuItemBg: '#1a1625',
    },
    Card: {
      colorBgContainer: '#1a1625',
      colorBorderSecondary: 'rgba(212, 165, 116, 0.15)',
    },
    Table: {
      colorBgContainer: '#1a1625',
      headerBg: '#252032',
      rowHoverBg: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    Button: {
      primaryShadow: '0 4px 12px rgba(255, 36, 66, 0.3)',
    },
    Input: {
      colorBgContainer: 'rgba(255, 255, 255, 0.04)',
      activeBorderColor: '#FF2442',
      hoverBorderColor: 'rgba(255, 36, 66, 0.5)',
    },
    Select: {
      colorBgContainer: 'rgba(255, 255, 255, 0.04)',
      optionSelectedBg: 'rgba(255, 36, 66, 0.15)',
    },
    Modal: {
      contentBg: '#1a1625',
      headerBg: '#1a1625',
    },
    Tabs: {
      inkBarColor: '#FF2442',
      itemActiveColor: '#FF2442',
      itemSelectedColor: '#FF2442',
      itemHoverColor: '#FF4D6B',
    },
    Tag: {
      colorBgContainer: 'transparent',
    },
    Timeline: {
      dotBg: '#1a1625',
    },
    Calendar: {
      colorBgContainer: '#1a1625',
      itemActiveBg: 'rgba(255, 36, 66, 0.15)',
    },
    Spin: {
      colorPrimary: '#FF2442',
    },
    Upload: {
      colorBgContainer: 'rgba(255, 255, 255, 0.04)',
    },
  },
};

export default antdTheme;
