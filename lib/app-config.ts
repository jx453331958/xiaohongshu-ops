export type AppConfig = { name: string; shortName: string; subtitle: string }

export const defaultAppConfig: AppConfig = {
  name: '小红书运营',
  shortName: 'XHS',
  subtitle: '通用运营后台',
}

export function getAppConfig(): AppConfig {
  return {
    name: process.env.APP_NAME || defaultAppConfig.name,
    shortName: process.env.APP_SHORT_NAME || defaultAppConfig.shortName,
    subtitle: process.env.APP_SUBTITLE || defaultAppConfig.subtitle,
  }
}
