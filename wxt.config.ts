import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  outDir: 'output',
  manifest: {
    name: '智谱秒杀助手',
    description: '智谱 Coding Plan 秒杀助手浏览器扩展',
    permissions: ['storage', 'tabs', 'scripting', 'alarms', 'notifications'],
    host_permissions: ['*://*.bigmodel.cn/*'],
    web_accessible_resources: [
      {
        resources: ['bm-main.js'],
        matches: ['*://*.bigmodel.cn/*'],
      },
    ],
  },
  background: {
    // WXT auto-discovers entrypoints/background/sw.ts with "background" in path
  },
});
