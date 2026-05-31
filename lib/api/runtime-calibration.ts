const TARGET = 'https://bigmodel.cn/api/biz/pay/batch-preview';
const PROBE_COUNT = 8;
const PROBE_INTERVAL_MS = 1500;
const BEST_RATIO = 0.6;

interface ProbeResult {
  rttMs: number;
  serverTimeMs: number;   // Unix epoch from HTTP Date header
  localSendMs: number;    // Date.now() at send
  localRecvMs: number;    // Date.now() at recv
}

export interface CalibrationResult {
  latencyMs: number;      // median RTT
  clockOffsetMs: number;  // serverTime - localTime
  probes: ProbeResult[];
}

async function probeOnce(auth: {
  authorization: string;
  bigmodelOrganization: string;
  bigmodelProject: string;
}): Promise<ProbeResult> {
  // performance.now() for accurate RTT, Date.now() for clock offset (same base as server Date header)
  const perfSend = performance.now();
  const dateSend = Date.now();

  const res = await fetch(TARGET, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'authorization': auth.authorization,
      'bigmodel-organization': auth.bigmodelOrganization,
      'bigmodel-project': auth.bigmodelProject,
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  });

  // Consume response to ensure full round-trip
  await res.text();
  const dateRecv = Date.now();
  const perfRecv = performance.now();

  const rttMs = perfRecv - perfSend;
  const serverTimeStr = res.headers.get('Date');
  const serverTimeMs = serverTimeStr ? new Date(serverTimeStr).getTime() : 0;

  return { rttMs, serverTimeMs, localSendMs: dateSend, localRecvMs: dateRecv };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function calibrate(
  auth: {
    authorization: string;
    bigmodelOrganization: string;
    bigmodelProject: string;
  },
  onProgress?: (done: number, total: number) => void,
): Promise<CalibrationResult> {
  const probes: ProbeResult[] = [];

  for (let i = 0; i < PROBE_COUNT; i++) {
    try {
      const result = await probeOnce(auth);
      probes.push(result);
    } catch {
      // Skip failed probes
    }
    onProgress?.(i + 1, PROBE_COUNT);
    if (i < PROBE_COUNT - 1) {
      await new Promise(r => setTimeout(r, PROBE_INTERVAL_MS));
    }
  }

  if (probes.length === 0) {
    return { latencyMs: 0, clockOffsetMs: 0, probes: [] };
  }

  // Take best 60% by lowest RTT (NTP-style filtering)
  const sorted = [...probes].sort((a, b) => a.rttMs - b.rttMs);
  const keep = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * BEST_RATIO)));

  const latencies = keep.map(p => p.rttMs);
  const latencyMs = Math.round(median(latencies));

  // Clock offset: serverTime - localTime, estimated at mid-RTT
  const offsets = keep
    .filter(p => p.serverTimeMs > 0)
    .map(p => {
      const localMidMs = (p.localSendMs + p.localRecvMs) / 2;
      const estimatedServerAtMid = p.serverTimeMs + p.rttMs / 2;
      return estimatedServerAtMid - localMidMs;
    });

  const clockOffsetMs = offsets.length > 0
    ? Math.round(median(offsets))
    : 0;

  return { latencyMs, clockOffsetMs, probes: keep };
}
