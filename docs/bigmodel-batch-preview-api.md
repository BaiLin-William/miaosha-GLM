# bigmodel.cn/batch-preview API 探查报告

**探查时间**: 2026-05-29 22:18 (UTC+8)
**页面来源**: https://bigmodel.cn/glm-coding
**请求状态**: 200 OK

---

## 1. API 端点

```
POST https://bigmodel.cn/api/biz/pay/batch-preview
```

**Query Parameters**:
- `refer__1090`: 追踪参数（Base64 编码的渠道标识）

---

## 2. Request Headers（请求头）

| Header | Value |
|--------|-------|
| `authorization` | JWT Token (HS512) |
| `bigmodel-organization` | `org-7369f0B6C8DA44C0B70ee373c986bf81` |
| `bigmodel-project` | `proj_015E67feC12A4605932AeD380dA2cb88` |
| `content-type` | `application/json;charset=UTF-8` |
| `accept` | `application/json, text/plain, */*` |
| `accept-language` | `zh` |
| `set-language` | `zh` |
| `referer` | `https://bigmodel.cn/glm-coding` |
| `origin` | `https://bigmodel.cn` |
| `user-agent` | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36` |
| `sec-ch-ua` | `"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"` |
| `sec-ch-ua-mobile` | `?0` |
| `sec-ch-ua-platform` | `"macOS"` |
| `sec-fetch-dest` | `empty` |
| `sec-fetch-mode` | `cors` |
| `sec-fetch-site` | `same-origin` |
| `priority` | `u=1, i` |
| `content-length` | `21` |

**Cookie（关键项）**:
- `bigmodel_token_production`: JWT Token（与 authorization header 相同）
- `acw_tc`: 安全验证 token
- 其他：Google Analytics、神策分析等追踪 cookie

---

## 3. Request Body（请求体）

```json
{"invitationCode":""}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `invitationCode` | string | 邀请码，空字符串表示无邀请码 |

---

## 4. Response Headers（响应头）

| Header | Value |
|--------|-------|
| `content-type` | `application/json;charset=UTF-8` |
| `access-control-allow-origin` | `https://bigmodel.cn` |
| `access-control-allow-credentials` | `true` |
| `content-encoding` | `gzip` |
| `strict-transport-security` | `max-age=31536000` |
| `x-log-id` | `20260529221859b7ed51d6daf54bf3` |
| `date` | `Fri, 29 May 2026 14:18:59 GMT` |

---

## 5. Response Body（响应体）

```json
{
  "code": 200,
  "msg": "操作成功",
  "success": true,
  "data": {
    "isSubscribed": false,
    "isAuthenticated": null,
    "productList": [
      // 9 个产品...
    ]
  }
}
```

### 5.1 顶层结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | number | 状态码，200 表示成功 |
| `msg` | string | 状态消息 |
| `success` | boolean | 是否成功 |
| `data.isSubscribed` | boolean | 当前用户是否已订阅 |
| `data.isAuthenticated` | boolean/null | 认证状态 |
| `data.productList` | array | 产品列表（9个产品） |

### 5.2 产品列表详情

每个产品对象结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `productId` | string | 产品ID（如 `product-b8ea38`） |
| `originalAmount` | number | 原价（元） |
| `discountAmount` | number | 折后价（元） |
| `payAmount` | number | 实际支付金额（元） |
| `monthlyOriginalAmount` | number | 月均原价 |
| `monthlyRenewAmount` | number | 月均续费价 |
| `monthlyPayAmount` | number | 月均支付价 |
| `renewAmount` | number | 续费总金额 |
| `soldOut` | boolean | 是否售罄 |
| `forbidden` | boolean | 是否禁用 |
| `canPurchase` | boolean/null | 是否可购买 |
| `inCurrentPeriod` | boolean | 是否在当前订阅周期内 |
| `hasFirstTimeSubscriptionPromo` | boolean | 是否有首次订阅优惠 |
| `delay` | boolean | 是否延迟生效 |
| `campaignDiscountDetails` | array | 优惠活动详情 |

### 5.3 产品列表（9个产品）

| # | Product ID | 原价 | 折后价 | 月均价 | 售罄 | 优惠活动 |
|---|------------|------|--------|--------|------|----------|
| 1 | product-b8ea38 | ¥147.00 | ¥132.30 | ¥44.10/月 | ✅ | 连续包季 9折 |
| 2 | product-2fc421 | ¥469.00 | ¥469.00 | ¥469.00/月 | ✅ | 无 |
| 3 | product-fef82f | ¥447.00 | ¥402.30 | ¥134.10/月 | ✅ | 连续包季 9折 |
| 4 | product-70a804 | ¥588.00 | ¥470.40 | ¥39.20/月 | ✅ | 连续包年 8折 |
| 5 | product-5643e6 | ¥1788.00 | ¥1430.40 | ¥119.20/月 | ✅ | 连续包年 8折 |
| 6 | product-02434c | ¥49.00 | ¥49.00 | ¥49.00/月 | ✅ | 无 |
| 7 | product-d46f8b | ¥5628.00 | ¥4502.40 | ¥375.20/月 | ✅ | 连续包年 8折 |
| 8 | product-1df3e1 | ¥149.00 | ¥149.00 | ¥149.00/月 | ✅ | 无 |
| 9 | product-5d3a03 | ¥1407.00 | ¥1266.30 | ¥422.10/月 | ✅ | 连续包季 9折 |

### 5.4 产品对应关系（根据页面定价推测）

| 产品 | 对应套餐 | 周期 | 月均价 |
|------|----------|------|--------|
| product-b8ea38 | Lite | 连续包季 | ¥44.10 |
| product-02434c | Lite | 连续包月 | ¥49.00 |
| product-70a804 | Lite | 连续包年 | ¥39.20 |
| product-1df3e1 | Pro | 连续包月 | ¥149.00 |
| product-fef82f | Pro | 连续包季 | ¥134.10 |
| product-5643e6 | Pro | 连续包年 | ¥119.20 |
| product-2fc421 | Max | 连续包月 | ¥469.00 |
| product-5d3a03 | Max | 连续包季 | ¥422.10 |
| product-d46f8b | Max | 连续包年 | ¥375.20 |

### 5.5 优惠活动结构（campaignDiscountDetails）

```json
{
  "campaignName": "连续包季 9 折",
  "campaignDiscountAmount": 14.70,
  "rewardMode": "PERCENT",
  "rewardAmount": 10.00,
  "rewardDetail": "连续包季 9 折",
  "applyScene": "REGULAR_DISCOUNT"
}
```

| 字段 | 说明 |
|------|------|
| `campaignName` | 活动名称 |
| `campaignDiscountAmount` | 优惠金额 |
| `rewardMode` | 奖励模式（PERCENT=百分比） |
| `rewardAmount` | 折扣比例（10=10%折扣，即9折） |
| `rewardDetail` | 优惠详情 |
| `applyScene` | 适用场景（REGULAR_DISCOUNT=常规折扣） |

---

## 6. 关键发现

1. **所有产品均已售罄** (`soldOut: true`)，页面按钮显示"暂时售罄 ｜05月30日 10:00 补货"
2. **用户未订阅** (`isSubscribed: false`)
3. **请求体极简**：只需 `invitationCode` 字段，空字符串表示无邀请码
4. **JWT 认证**：authorization header 和 cookie 中都携带 JWT token
5. **组织/项目标识**：通过 `bigmodel-organization` 和 `bigmodel-project` header 标识
6. **CORS 配置**：仅允许 `https://bigmodel.cn` 源访问

---

## 7. 调用时机

该 API 在 GLM Coding Plan 定价页面加载时自动调用，用于预览所有产品的价格信息（含折扣）。无需用户交互即可获取。

---

## 8. 安全注意事项

- JWT Token 和 Cookie 包含敏感信息，已脱敏处理
- 实际调用时需携带有效的 `authorization` header 和 `bigmodel_token_production` cookie
- `bigmodel-organization` 和 `bigmodel-project` 为固定值，与账户绑定
