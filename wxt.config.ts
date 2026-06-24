import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  outDir: 'output',
  vite: () => ({
    build: {
      // Use Terser instead of the default Rolldown/esbuild minifier. The
      // default minifier reused a mangled identifier (`A`) for both a
      // top-level constant (SALE_TIME_DEFAULT) and a helper function in the
      // same scope, silently corrupting runtime semantics.
      minify: 'terser',
      terserOptions: {
        mangle: {
          // Keep function/class names to avoid collisions with mangled
          // top-level constants imported from other modules.
          keep_fnames: true,
        },
      },
    },
  }),
  manifest: {
    name: '智谱秒杀助手',
    description: '多平台 Coding Plan 秒杀助手浏览器扩展（智谱 / 火山引擎）',
    permissions: ['storage', 'tabs', 'scripting', 'alarms', 'notifications'],
    host_permissions: ['*://*.bigmodel.cn/*', '*://*.volcengine.com/*'],
    web_accessible_resources: [
      {
        resources: ['bm-early.js', 'bm-main.js'],
        matches: ['*://*.bigmodel.cn/*'],
      },
      {
        resources: ['volc-agentplan-main.js', 'volc-codingplan-main.js'],
        matches: ['*://*.volcengine.com/*'],
      },
    ],
  },
});
