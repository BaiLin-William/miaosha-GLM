var O = '__bm_overlay';
var CSS =
  '#'+O+'{position:fixed;top:20px;right:20px;width:300px;background:rgba(255,255,255,0.97);backdrop-filter:blur(12px);border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:99999;font-family:Inter,system-ui,sans-serif;color:#1e293b;max-height:calc(100vh - 40px);overflow-y:auto}' +
  '#'+O+'::-webkit-scrollbar{width:3px}#'+O+'::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.2);border-radius:99px}' +
  '#'+O+' .h{padding:10px 14px;background:rgba(99,102,241,0.05);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:6px;cursor:move;position:sticky;top:0;z-index:1}' +
  '#'+O+' .h h3{font-size:12px;font-weight:800;flex:1;margin:0}' +
  '#'+O+' .mn{width:18px;height:18px;border-radius:50%;border:0;background:#e2e8f0;cursor:pointer;font-size:9px;display:grid;place-items:center;color:#475569}' +
  '#'+O+' .b{padding:10px 12px}' +
  // Cards
  '#'+O+' .c{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:8px}' +
  '#'+O+' .ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}' +
  '#'+O+' .ct{font-size:11px;font-weight:700;display:flex;align-items:center;gap:5px}' +
  '#'+O+' .tg{font-size:7px;font-weight:800;padding:2px 5px;border-radius:3px;text-transform:uppercase;letter-spacing:.05em}' +
  '#'+O+' .tg-a{background:#fffbeb;color:#d97706;border:1px solid #fde68a}' +
  '#'+O+' .tg-r{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}' +
  '#'+O+' .tg-g{background:#f0fdf4;color:#059669;border:1px solid #a7f3d0}' +
  // Prep
  '#'+O+' .pg{display:grid;grid-template-columns:1fr 1fr;gap:4px}' +
  '#'+O+' .pc{padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;gap:5px}' +
  '#'+O+' .pd{width:6px;height:6px;border-radius:50%;flex-shrink:0}' +
  '#'+O+' .pd.ok{background:#10b981}#'+O+' .pd.w{background:#f59e0b}' +
  '#'+O+' .pn{font-size:9px;font-weight:600;color:#475569}' +
  '#'+O+' .pb{font-size:8px;font-weight:700;color:#6366f1;font-family:monospace}' +
  // Pool
  '#'+O+' .pl-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}' +
  '#'+O+' .pl-l{font-size:9px;font-weight:700;color:#475569}' +
  '#'+O+' .pl-c{font-size:9px;font-weight:800;color:#6366f1;font-family:monospace}' +
  '#'+O+' .pl-t{font-size:8px;color:#94a3b8}' +
  '#'+O+' .gr{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin:6px 0}' +
  '#'+O+' .sl{height:18px;border-radius:4px;border:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:7px;color:#94a3b8}' +
  '#'+O+' .sl.f{border-color:#10b981;background:rgba(16,185,129,0.05);color:#10b981;font-weight:700}' +
  '#'+O+' .ab{width:100%;padding:6px;border:1.5px dashed #6366f1;border-radius:6px;background:rgba(99,102,241,0.03);color:#6366f1;font-family:inherit;font-weight:700;font-size:9px;cursor:pointer;transition:all .15s}' +
  '#'+O+' .ab:hover{background:rgba(99,102,241,0.08);border-style:solid}' +
  '#'+O+' .ab:disabled{opacity:.4;cursor:not-allowed}' +
  // Fire
  '#'+O+' .fm{display:flex;gap:3px;margin:6px 0}' +
  '#'+O+' .fp{flex:1;height:5px;border-radius:3px;background:#e2e8f0}' +
  '#'+O+' .fp.on{background:#f43f5e}' +
  '#'+O+' .fi{display:flex;justify-content:space-between;margin-bottom:6px}' +
  '#'+O+' .fi>div{text-align:center;flex:1}' +
  '#'+O+' .fn{font-size:16px;font-weight:900;font-family:monospace}' +
  '#'+O+' .fl{font-size:7px;color:#94a3b8;font-weight:600}' +
  '#'+O+' .fb{width:100%;padding:8px;border:0;border-radius:10px;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;font-family:inherit;font-weight:800;font-size:11px;cursor:pointer;transition:all .15s}' +
  '#'+O+' .fb:hover{transform:translateY(-1px)}#'+O+' .fb:disabled{opacity:.35;cursor:not-allowed;transform:none}' +
  // Runtime
  '#'+O+' .rr{display:flex;gap:4px}' +
  '#'+O+' .rb{flex:1;text-align:center;padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}' +
  '#'+O+' .rv{font-size:16px;font-weight:900;font-family:monospace}' +
  '#'+O+' .rl{font-size:7px;color:#94a3b8;font-weight:600}' +
  // Payment
  '#'+O+' .pw{padding:8px}' +
  '#'+O+' .ph{display:flex;align-items:center;gap:6px;margin-bottom:4px}' +
  '#'+O+' .pt{font-size:10px;font-weight:700;flex:1}' +
  '#'+O+' .ps{font-size:7px;font-weight:800;padding:2px 5px;border-radius:3px;text-transform:uppercase}' +
  '#'+O+' .sg{background:#f8fafc;color:#94a3b8;border:1px solid #e2e8f0}' +
  '#'+O+' .s-b{background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe}' +
  '#'+O+' .s-g{background:#f0fdf4;color:#059669;border:1px solid #a7f3d0}' +
  '#'+O+' .pw-t{text-align:center;padding:8px 0;font-size:9px;color:#94a3b8}' +
  '#'+O+' .pw-q{width:100px;height:100px;border-radius:8px;border:1px solid #e2e8f0;object-fit:contain;margin:0 auto 6px}' +
  '#'+O+' .pw-am{font-size:16px;font-weight:900;color:#dc2626;font-family:monospace;text-align:center}' +
  // Product selector
  '#'+O+' .pr-bill{display:flex;gap:3px;margin-bottom:6px}' +
  '#'+O+' .pr-bl{flex:1;text-align:center;padding:4px;border:1px solid #e2e8f0;border-radius:5px;font-size:7px;color:#94a3b8;cursor:pointer;transition:all .15s;font-family:inherit;background:0}' +
  '#'+O+' .pr-bl.on{border-color:#6366f1;color:#6366f1;font-weight:700;background:rgba(99,102,241,0.04)}' +
  '#'+O+' .pr-t{border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:4px;transition:all .15s}' +
  '#'+O+' .pr-t.on{border-color:#6366f1}' +
  '#'+O+' .pr-th{display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:pointer;transition:background .15s}' +
  '#'+O+' .pr-th:hover{background:#f8fafc}' +
  '#'+O+' .pr-t.on .pr-th{background:rgba(99,102,241,0.04)}' +
  '#'+O+' .pr-td{width:10px;height:10px;border-radius:50%;border:1.5px solid #cbd5e1;flex-shrink:0;transition:all .15s;display:flex;align-items:center;justify-content:center;font-size:6px;color:transparent}' +
  '#'+O+' .pr-t.on .pr-td{border-color:#6366f1;background:#6366f1;color:#fff}' +
  '#'+O+' .pr-tn{font-size:10px;font-weight:700;flex:1}' +
  '#'+O+' .pr-tp{font-size:9px;font-family:monospace;color:#94a3b8}' +
  '#'+O+' .pr-tp b{color:#dc2626;font-weight:800}' +
  '#'+O+' .pr-ts{font-size:6px;font-weight:700;padding:1px 4px;border-radius:3px}' +
  '#'+O+' .pr-ts.ok{background:#f0fdf4;color:#059669}' +
  '#'+O+' .pr-ts.warn{background:#fef3c7;color:#d97706}' +
  '#'+O+' .pr-ti{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 8px 6px}' +
  '#'+O+' .pr-ti div{font-size:7px;color:#64748b;line-height:1.35}' +
  '#'+O+' .pr-ti b{display:block;font-size:8px;color:#334155;font-weight:700;font-family:monospace}' +
  '#'+O+' .pr-tb{display:none;padding:0 8px 6px;font-size:8px;color:#64748b;line-height:1.4}' +
  '#'+O+' .pr-t.open .pr-tb{display:block}' +
  '#'+O+' .pr-tf{display:flex;flex-wrap:wrap;gap:2px;margin-top:3px}' +
  '#'+O+' .pr-tf span{font-size:7px;padding:1px 5px;background:#f1f5f9;border-radius:3px;color:#475569}' +
  '#'+O+' .pr-sel{font-size:8px;color:#94a3b8;margin-top:4px}' +
  '#'+O+' .pr-sel b{color:#6366f1;font-weight:800}' +
  // Log
  '#'+O+' .lg{padding:4px 6px;background:#0f172a;border-radius:6px;max-height:40px;overflow-y:auto;font-size:7px;font-family:monospace;color:#64748b;line-height:1.4}' +
  '#'+O+' .lg::-webkit-scrollbar{width:2px}' +
  '#'+O+' .lg::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:99px}' +
  '#'+O+' .fm-lgd{width:6px;height:6px;border-radius:2px}';
