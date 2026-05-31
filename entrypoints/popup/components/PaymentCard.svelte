<script lang="ts">
  import type { PaymentState } from '../../../lib/api/types';

  let { payment }: { payment: PaymentState } = $props();

  const hasQr = $derived(!!payment.qrCode);
  const isPending = $derived(payment.status === 'pending');
  const isSuccess = $derived(payment.status === 'success');
  const isExpired = $derived(payment.status === 'expired');
  const isError = $derived(payment.status === 'error');
  const isWaiting = $derived(payment.status === 'waiting' && !payment.qrCode);

  function statusLabel(): string {
    if (isSuccess) return 'Payment Confirmed';
    if (isPending) return 'Awaiting Payment';
    if (isExpired) return 'Order Expired';
    if (isError) return payment.errorMsg || 'Error';
    if (hasQr) return 'Scan to Pay';
    return 'Waiting for order...';
  }

  function statusClass(): string {
    if (isSuccess) return 's-green';
    if (isPending) return 's-amber';
    if (isExpired || isError) return 's-red';
    if (hasQr) return 's-blue';
    return 's-gray';
  }

  function formatAmount(a: number | null): string {
    if (a === null) return '--';
    return `¥${a.toFixed(2)}`;
  }

  function elapsed(): string {
    if (!payment.updatedAt) return '';
    const sec = Math.floor((Date.now() - payment.updatedAt) / 1000);
    if (sec < 60) return `${sec}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
  }
</script>

<div class="pay-card">
  <div class="pay-hd">
    <span class="pay-icon">&#128179;</span>
    <span class="pay-title">Payment</span>
    <span class="pay-status {statusClass()}">{statusLabel()}</span>
  </div>

  {#if isWaiting}
    <div class="pay-placeholder">
      <div class="ph-spinner"></div>
      <span class="ph-text">Waiting for order data...</span>
      <span class="ph-hint">Complete captcha on bigmodel.cn to trigger order</span>
    </div>
  {:else if hasQr}
    <div class="pay-qr-wrap">
      <img class="pay-qr" src={payment.qrCode!} alt="Payment QR Code" />
      <div class="pay-info">
        {#if payment.amount}
          <div class="pay-amount">{formatAmount(payment.amount)}</div>
        {/if}
        {#if payment.productId}
          <div class="pay-product">{payment.productId}</div>
        {/if}
        {#if isPending}
          <div class="pay-timer">Expires in 15 min</div>
        {/if}
        {#if elapsed()}
          <div class="pay-elapsed">{elapsed()}</div>
        {/if}
      </div>
    </div>
  {:else if isSuccess}
    <div class="pay-success">
      <span class="ps-icon">&#10003;</span>
      <span class="ps-text">Payment confirmed!</span>
      {#if payment.bizId}
        <span class="ps-order">Order: {payment.bizId.slice(0, 8)}...</span>
      {/if}
    </div>
  {:else if isExpired || isError}
    <div class="pay-error">
      <span class="pe-text">{statusLabel()}</span>
      <span class="pe-hint">Try again on bigmodel.cn</span>
    </div>
  {/if}
</div>

<style>
  .pay-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 14px 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }

  .pay-hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .pay-icon {
    font-size: 14px;
  }

  .pay-title {
    font-size: 12px;
    font-weight: 700;
    color: #1e293b;
    flex: 1;
  }

  .pay-status {
    font-size: 8px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .s-gray { background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; }
  .s-blue { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
  .s-amber { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
  .s-green { background: #f0fdf4; color: #059669; border: 1px solid #a7f3d0; }
  .s-red { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

  /* Waiting state */
  .pay-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px 0;
  }

  .ph-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .ph-text {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
  }

  .ph-hint {
    font-size: 9px;
    color: #94a3b8;
    text-align: center;
  }

  /* QR code state */
  .pay-qr-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pay-qr {
    width: 120px;
    height: 120px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    object-fit: contain;
    background: #fff;
  }

  .pay-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .pay-amount {
    font-size: 18px;
    font-weight: 900;
    color: #dc2626;
    font-family: 'JetBrains Mono', monospace;
  }

  .pay-product {
    font-size: 9px;
    color: #94a3b8;
    font-family: 'JetBrains Mono', monospace;
  }

  .pay-timer {
    font-size: 9px;
    color: #d97706;
    font-weight: 600;
  }

  .pay-elapsed {
    font-size: 8px;
    color: #94a3b8;
  }

  /* Success state */
  .pay-success {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
  }

  .ps-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #10b981;
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .ps-text {
    font-size: 12px;
    font-weight: 700;
    color: #059669;
  }

  .ps-order {
    font-size: 9px;
    color: #94a3b8;
    font-family: 'JetBrains Mono', monospace;
    margin-left: auto;
  }

  /* Error state */
  .pay-error {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 0;
  }

  .pe-text {
    font-size: 11px;
    font-weight: 600;
    color: #dc2626;
  }

  .pe-hint {
    font-size: 9px;
    color: #94a3b8;
  }
</style>
