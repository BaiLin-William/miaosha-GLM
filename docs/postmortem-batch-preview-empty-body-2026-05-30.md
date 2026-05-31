# Postmortem: batch-preview 响应体为空（popup DEV 模式）

**日期**: 2026-05-30  
**严重级别**: P2（功能完全失效，DEV 调试面板核心能力）  
**修复 commit**: `f18d222`  
**修复 tag**: `fix/batch-preview-stale-auth-2026-05-30`  
**参考基准 commit**: `605811d`（彼时 DEV 面板工作正常）

---

## 1. 问题现象

打开 popup → DEV 模式 → 点击 `batch-preview` 的 **Test** 按钮：

| 字段 | 实际值 | 期望值 |
|------|--------|--------|
| status | 200 | 200 ✓ |
| durationMs | ~39ms | ~160ms |
| content-length | 0 | — |
| RESPONSE BODY | 空 | `{"code":200,"data":{"productList":[...]}}` (4860B) |

同一时间，直接在 bigmodel.cn 主页执行同源 `fetch` 可以拿到完整的 84B 错误 JSON 或完整 productList。

---

## 2. 误区：我们在哪里走错了

### 误区一：怀疑 CORS / 扩展 origin 问题

**假设**：`chrome-extension://` origin 发出的请求被服务端 CORS 策略阻断，导致 body 被浏览器丢弃。

**为什么这个方向吸引了注意力**：
- 在 `605811d` 之后，`client.ts` 被完全重写为 `executeScript` + `world: 'MAIN'` 方案，理由正是要规避 CORS。
- 调试时发现响应头里没有 `access-control-allow-origin: chrome-extension://...`。
- 服务端偶发 `content-length: 0`，让人以为是 CORS block。

**为什么这是误区**：
- `executeScript` 注入的 `fetch` 运行在 bigmodel.cn 的 MAIN world，同源请求根本不触发 CORS。
- 问题不在传输层，在调用层：传递给 `executeScript` 的 auth headers 本身就是无效 token。

### 误区二：怀疑 build 未更新（旧 chunk 仍在浏览器中）

**假设**：浏览器加载的是旧 build 的 `popup-D1mpjm39.js`，用的是 `605811d` 之前的简单 `fetch()` 方案，跨 origin 被 CORS 拒绝。

**为什么这个方向部分正确**：
- 确实，在调查早期，扩展 **没有重新 build**。旧 build 使用直接 `fetch()`，服务端因 `chrome-extension://` origin 返回空 body，这是 **真实发生的 bug**。
- `npm run build` + 重载之后，popup chunk 变成 `popup-D1mpjm39.js`（含 `executeScript` 逻辑），证明了这一层已修复。

**为什么这是误区**：
- Build 更新后问题**仍然存在**。我们停在了"build 层"，没有继续向上追溯到"auth 层"。

### 误区三：怀疑 captureFromTab 在 executeScript 的注入函数内失败

**假设**：`executeScript` 注入的 async 函数内部做了某些操作导致 fetch 失败。

**为什么没有追这个方向**：
- monkey-patch 拦截器已经确认：`executeScript` 被调用了，4 个参数正确传入，server 也回了 200，只是 body 为空。
- 注入函数本身的 fetch 是同源的，不可能失败。

---

## 3. 根因：双 key 的 JWT 存储竞争

### 问题的本质

`chrome.storage.local` 里同时存在两条 auth 记录，指向**不同的用户 JWT**：

```
chrome.storage.local['authHeaders']       → JWT#A  user_key: 62d7f1f7...  (旧/失效)
chrome.storage.local['local:authHeaders'] → JWT#B  user_key: b1c8f4c4...  (新/有效)
```

### 写入路径分析

| 写入者 | 写入 key | 写入方式 | 内容 |
|--------|----------|----------|------|
| `entrypoints/bm-capture.content.ts` | `local:authHeaders` | WXT `storage.setItem('local:authHeaders', ...)` | 每次 `captureFromTab()` 都写最新 JWT |
| WXT storage 内部实现 | `authHeaders` | `chrome.storage.local.set({'local:authHeaders': v})` 写字面量 key | 与上面同一调用，但 WXT 是用字面量 key 存 |

**关键发现**：WXT 的 `storage.setItem('local:authHeaders', v)` 实际调用是：
```js
chrome.storage.local.set({ 'local:authHeaders': v })
// 即 key = 字面量 'local:authHeaders'，不做任何 prefix strip
```

所以 `authHeaders`（无 prefix）这个 key 是**另一个写入路径**留下的遗留数据，对应更早时期（`605811d` 之前）使用简单 key 写入的旧 JWT。

### 故障链

```
popup $effect 启动
  └→ authStore.get()               // WXT storage.getItem('local:authHeaders')
       └→ chrome.storage.local.get('local:authHeaders')  // 正确，但…
            └→ 找到了！旧 JWT#A（user_key: 62d7f1f7）被写到这里
                 └→ h 非 null → 直接 authHeaders = h
                      └→ 从不调用 captureFromTab()
                           └→ testEndpoint 用旧 JWT#A
                                └→ 服务端验证失败 → content-length: 0
                                     └→ bodyText: "" → body: null → UI 不渲染
```

等等，上面有一处需要修正：WXT 读到的其实是 `local:authHeaders` key 的值，但这个 key 下的 JWT 比 `captureFromTab()` 写入的 JWT **更旧**（因为 `captureFromTab()` 上次写入时间可能已经过去很久）。

实际验证数据（2026-05-30 现场）：

```json
// authStore.get() 返回的 token（WXT 从 local:authHeaders 读）
{ "user_key": "62d7f1f7-1ce7-45bb-a14b-7251806cfb32" }  → bodyLen: 0

// captureFromTab() 从 bigmodel.cn MAIN world 实时抓的 token
{ "user_key": "b1c8f4c4-6427-4f9a-a8cf-bf9b41149215" }  → bodyLen: 4860
```

**结论**：服务端的 JWT 已经轮换（bigmodel.cn 重新颁发了 token），但 `chrome.storage` 里缓存的仍是旧 token。因为 popup `$effect` 发现缓存非 null 就不刷新，导致永远使用旧 JWT。

---

## 4. 修复

**文件**: `entrypoints/popup/components/DevContent.svelte`

```diff
  $effect(() => {
-   authStore.get().then(async (h) => {
-     if (h) {
-       authHeaders = h;
-     } else {
-       const captured = await authStore.captureFromTab();
-       if (captured) authHeaders = captured;
-     }
-     authLoaded = true;
-   });
+   (async () => {
+     // Always capture fresh auth from the bigmodel.cn tab so we never use a stale JWT.
+     // Fall back to the cached value only when no bigmodel.cn tab is open.
+     const captured = await authStore.captureFromTab();
+     authHeaders = captured ?? (await authStore.get());
+     authLoaded = true;
+   })();
  });
```

**核心原则改变**：

| 旧逻辑 | 新逻辑 |
|--------|--------|
| 缓存优先：有缓存就用缓存 | 实时优先：每次 popup 打开都从 tab 抓最新 JWT |
| `captureFromTab()` 是"兜底" | `captureFromTab()` 是"首选" |
| 缓存 null 时才刷新 | 缓存作为"无 tab 时的兜底" |

`captureFromTab()` 内部通过 `executeScript` 在 bigmodel.cn 的 MAIN world 读取 `document.cookie` 和 `localStorage`，获取当前有效 session 的 JWT，然后写回 storage 并返回。

---

## 5. 验证

修复后，在 popup 中通过 MCP Chrome DevTools 拦截 `executeScript` 调用：

```json
{
  "authUserKey": "b1c8f4c4-6427-4f9a-a8cf-bf9b41149215",
  "status": 200,
  "bodyLen": 4860,
  "preview": "{\"code\":200,\"msg\":\"Operation successful\",\"data\":{\"productList\":[{\"productId\":\"product-b8ea38\"..."
}
```

UI 的 RESPONSE BODY 面板完整展示了包含 `productList` 的 4860 字节 JSON。

---

## 6. 经验教训

### L1：auth 层面的 bug 不会暴露在传输层

本次 bug 的所有外部症状（`content-length: 0`、body 为空）和 CORS 失败的症状完全相同，但原因完全不同。**应该先验证"传递了什么"，再验证"传输是否成功"。**

诊断顺序应当是：

```
❌ 错误顺序：症状 → 传输层假设 → CORS 检查 → build 检查 → …
✅ 正确顺序：症状 → 拦截实际传参 → 验证 token 有效性 → 找写入路径
```

### L2：cache-first auth 是反模式（对短生命周期 JWT）

bigmodel.cn 的 JWT 会随用户重新登录而轮换，popup 的缓存无法感知这种轮换。任何 DEV 工具如果依赖缓存 auth，都应当在每次使用前主动刷新。

### L3：WXT storage prefix 和 chrome.storage 原始 key 是同一命名空间

WXT `storage.setItem('local:authHeaders', v)` → `chrome.storage.local['local:authHeaders'] = v`（字面量，不做 strip）。如果有其他代码直接操作 `chrome.storage.local.set({'authHeaders': x})`，会产生两个独立的 key，互不覆盖，容易造成混淆。

### L4：monkey-patch 是验证假设最快的方法

与其读 build output、查 source map，不如直接在运行时拦截目标函数，打印实际参数。本次通过拦截 `chrome.scripting.executeScript` 在 30 秒内确认了"token 是什么"，而不是花几小时猜测。
