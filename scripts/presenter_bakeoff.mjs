#!/usr/bin/env node
/**
 * Presenter lip-sync bake-off: runs the same start-frame + voiceover through
 * two fal.ai endpoints and reports video URL, delivered seconds, cost, and
 * time taken for each.
 *
 * UNVERIFIED SCHEMAS: this session could not reach fal.ai (blocked by egress
 * policy), so the input params below (buildInput on each MODEL) are written
 * from best-known field names, NOT confirmed against fal's live docs. Do not
 * run this without --dry-run passing first, which fetches each endpoint's
 * live OpenAPI schema and diffs it against what this script would send.
 *
 * Usage:
 *   node scripts/presenter_bakeoff.mjs --start-frame <url> --voiceover <url> --dry-run
 *   node scripts/presenter_bakeoff.mjs --start-frame <url> --voiceover <url>
 *
 * Required env for a real run:
 *   FAL_KEY
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *   R2_PUBLIC_BASE_URL (optional, used to print a public URL for uploads)
 *   FAL_OMNIHUMAN_PRICE_PER_SECOND or FAL_OMNIHUMAN_PRICE_FLAT
 *   FAL_KLING_AVATAR_PRICE_PER_SECOND or FAL_KLING_AVATAR_PRICE_FLAT
 * Optional env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BAKEOFF_TABLE
 *     (if all three are set, a summary row is inserted after a real run;
 *     failure to insert is logged as a warning and never fails the run)
 */

import { createHash, createHmac } from 'node:crypto';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN_STATE_PATH = path.join(__dirname, '.bakeoff_dryrun_state.json');
const DRY_RUN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // a passed dry run is only trusted for 24h
const HARD_CAP_USD = 2.0;
const DEFAULT_DURATION_SECONDS = 5.0;

const OMNIHUMAN_PROMPT =
  'speaks warmly to camera with natural hand gestures and subtle head movement';

// --- Model definitions -------------------------------------------------
// buildInput()'s keys are UNVERIFIED against fal's live schema. --dry-run
// fetches the real schema and diffs it against these before any spend.
const MODELS = [
  {
    id: 'omnihuman-v1.5',
    endpoint: 'fal-ai/bytedance/omnihuman/v1.5',
    buildInput: (startFrameUrl, voiceoverUrl) => ({
      image_url: startFrameUrl,
      audio_url: voiceoverUrl,
      prompt: OMNIHUMAN_PROMPT,
      resolution: '720p',
    }),
    priceEnvPrefix: 'FAL_OMNIHUMAN',
  },
  {
    id: 'kling-ai-avatar-v2-standard',
    endpoint: 'fal-ai/kling-video/ai-avatar/v2/standard',
    buildInput: (startFrameUrl, voiceoverUrl) => ({
      image_url: startFrameUrl,
      audio_url: voiceoverUrl,
    }),
    priceEnvPrefix: 'FAL_KLING_AVATAR',
  },
];

// --- CLI parsing ---------------------------------------------------------
function parseArgs(argv) {
  const args = { dryRun: false, duration: DEFAULT_DURATION_SECONDS, outPrefix: 'bakeoff/' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--start-frame') args.startFrame = argv[++i];
    else if (a === '--voiceover') args.voiceover = argv[++i];
    else if (a === '--duration') args.duration = parseFloat(argv[++i]);
    else if (a === '--out-prefix') args.outPrefix = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.startFrame || !args.voiceover) {
    throw new Error('Usage: --start-frame <url> --voiceover <url> [--duration <sec>] [--dry-run]');
  }
  return args;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

// --- Pricing (must be explicitly configured; no built-in defaults, since
// this session could not verify fal's published rates) ------------------
function estimateModelCostUsd(model, durationSeconds) {
  const perSecond = process.env[`${model.priceEnvPrefix}_PRICE_PER_SECOND`];
  const flat = process.env[`${model.priceEnvPrefix}_PRICE_FLAT`];
  if (!perSecond && !flat) {
    throw new Error(
      `Set ${model.priceEnvPrefix}_PRICE_PER_SECOND and/or ${model.priceEnvPrefix}_PRICE_FLAT ` +
        `(verified against fal's current pricing page) before running ${model.endpoint}.`
    );
  }
  const perSecondUsd = perSecond ? parseFloat(perSecond) : 0;
  const flatUsd = flat ? parseFloat(flat) : 0;
  return flatUsd + perSecondUsd * durationSeconds;
}

// --- fal schema diff (dry run) -------------------------------------------
// UNVERIFIED: this URL pattern for fal's per-endpoint OpenAPI schema is not
// confirmed from this session. If it 404s or the shape doesn't match, the
// dry run fails loudly rather than silently passing.
function openapiUrlFor(endpoint) {
  return `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${encodeURIComponent(endpoint)}`;
}

async function fetchLiveInputSchema(endpoint) {
  const url = openapiUrlFor(endpoint);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Schema fetch failed for ${endpoint}: HTTP ${res.status} from ${url}`);
  }
  const spec = await res.json();
  const schemas = spec?.components?.schemas;
  if (!schemas) throw new Error(`No components.schemas in OpenAPI response for ${endpoint}`);
  // fal typically names the request-body schema "<AppName>Input" or similar;
  // scan all schemas for one whose properties look like an input schema
  // rather than guessing a single fixed name.
  const candidates = Object.entries(schemas).filter(([name]) => /input/i.test(name));
  if (candidates.length === 0) {
    throw new Error(`Could not locate an *Input schema among: ${Object.keys(schemas).join(', ')}`);
  }
  // Prefer the one with the most overlapping property names, decided later
  // in diffSchema by trying each candidate and keeping the best match.
  return candidates.map(([name, schema]) => ({ name, properties: schema.properties ?? {} }));
}

function diffAgainstCandidates(sentParams, candidates) {
  let best = null;
  for (const c of candidates) {
    const liveKeys = new Set(Object.keys(c.properties));
    const missingFromLive = Object.keys(sentParams).filter((k) => !liveKeys.has(k));
    const score = Object.keys(sentParams).length - missingFromLive.length;
    if (!best || score > best.score) best = { ...c, missingFromLive, score };
  }
  return best;
}

async function dryRunCheck(model, sentParams) {
  const candidates = await fetchLiveInputSchema(model.endpoint);
  const result = diffAgainstCandidates(sentParams, candidates);
  const ok = result.missingFromLive.length === 0;
  return { ok, schemaName: result.name, missingFromLive: result.missingFromLive };
}

// --- fal queue client ------------------------------------------------------
async function falSubmit(endpoint, input) {
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${requireEnv('FAL_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`fal submit failed for ${endpoint}: HTTP ${res.status} ${await res.text()}`);
  }
  return res.json(); // { request_id, status_url, response_url, ... }
}

async function falPollUntilDone(statusUrl, { intervalMs = 3000, timeoutMs = 10 * 60 * 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(statusUrl, {
      headers: { Authorization: `Key ${requireEnv('FAL_KEY')}` },
    });
    if (!res.ok) throw new Error(`fal status check failed: HTTP ${res.status}`);
    const body = await res.json();
    if (body.status === 'COMPLETED') return body;
    if (body.status === 'ERROR' || body.status === 'FAILED') {
      throw new Error(`fal job failed: ${JSON.stringify(body)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`fal job timed out after ${timeoutMs}ms`);
}

async function falFetchResult(responseUrl) {
  const res = await fetch(responseUrl, {
    headers: { Authorization: `Key ${requireEnv('FAL_KEY')}` },
  });
  if (!res.ok) throw new Error(`fal result fetch failed: HTTP ${res.status}`);
  return res.json();
}

// --- R2 (S3-compatible) upload via manual SigV4 -----------------------------
function sigv4Sign({ method, host, path: reqPath, region, service, payloadBuf, accessKeyId, secretAccessKey, extraHeaders = {} }) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(payloadBuf);

  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...extraHeaders,
  };
  const sortedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderNames.map((k) => `${k}:${headers[k]}\n`).join('');
  const signedHeaders = sortedHeaderNames.join(';');

  const canonicalRequest = [
    method,
    reqPath,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { ...headers, Authorization: authorization };
}

async function uploadToR2(key, buf, contentType) {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const bucket = requireEnv('R2_BUCKET');
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const reqPath = `/${bucket}/${key}`;

  const headers = sigv4Sign({
    method: 'PUT',
    host,
    path: reqPath,
    region: 'auto',
    service: 's3',
    payloadBuf: buf,
    accessKeyId,
    secretAccessKey,
    extraHeaders: { 'content-type': contentType },
  });

  const res = await fetch(`https://${host}${reqPath}`, { method: 'PUT', headers, body: buf });
  if (!res.ok) {
    throw new Error(`R2 upload failed for ${key}: HTTP ${res.status} ${await res.text()}`);
  }
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  return publicBase ? `${publicBase.replace(/\/$/, '')}/${key}` : `r2://${bucket}/${key}`;
}

// --- Optional Supabase logging (never fatal) --------------------------------
async function logToSupabaseIfConfigured(rows) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_BAKEOFF_TABLE;
  if (!url || !key || !table) return;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      console.warn(`[warn] Supabase log insert failed: HTTP ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.warn(`[warn] Supabase log insert threw: ${err.message}`);
  }
}

// --- Dry-run state (gate for real spend) ------------------------------------
function paramsHashFor(args) {
  const material = MODELS.map((m) => JSON.stringify(m.buildInput(args.startFrame, args.voiceover))).join('|');
  return sha256Hex(`${args.startFrame}|${args.voiceover}|${material}`);
}

async function writeDryRunState(args) {
  const state = { passedAt: Date.now(), paramsHash: paramsHashFor(args) };
  await mkdir(path.dirname(DRY_RUN_STATE_PATH), { recursive: true });
  await writeFile(DRY_RUN_STATE_PATH, JSON.stringify(state, null, 2));
}

async function requirePassedDryRun(args) {
  let state;
  try {
    state = JSON.parse(await readFile(DRY_RUN_STATE_PATH, 'utf8'));
  } catch {
    throw new Error('No passed --dry-run found. Run with --dry-run first (it must exit 0).');
  }
  if (state.paramsHash !== paramsHashFor(args)) {
    throw new Error('Dry-run state is for different inputs. Re-run --dry-run with these exact args.');
  }
  if (Date.now() - state.passedAt > DRY_RUN_MAX_AGE_MS) {
    throw new Error('Dry-run state is stale (>24h old). Re-run --dry-run before spending.');
  }
}

// --- Main --------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  const totalEstimate = MODELS.reduce((sum, m) => {
    try {
      return sum + estimateModelCostUsd(m, args.duration);
    } catch (err) {
      if (args.dryRun) {
        console.warn(`[warn] ${err.message} (ignored for --dry-run; required before a real run)`);
        return sum;
      }
      throw err;
    }
  }, 0);

  if (!args.dryRun) {
    if (totalEstimate > HARD_CAP_USD) {
      throw new Error(
        `Estimated total cost $${totalEstimate.toFixed(2)} exceeds the $${HARD_CAP_USD.toFixed(2)} hard cap. Aborting before any spend.`
      );
    }
    await requirePassedDryRun(args);
  }

  if (args.dryRun) {
    console.log('--- DRY RUN: schema diff against fal live docs, no spend ---');
    let allOk = true;
    for (const model of MODELS) {
      const input = model.buildInput(args.startFrame, args.voiceover);
      console.log(`\n${model.id} (${model.endpoint})`);
      console.log('  params to send:', JSON.stringify(input));
      try {
        const { ok, schemaName, missingFromLive } = await dryRunCheck(model, input);
        if (ok) {
          console.log(`  OK - matches live schema "${schemaName}"`);
        } else {
          allOk = false;
          console.error(
            `  MISMATCH against live schema "${schemaName}": params not in live schema -> ${missingFromLive.join(', ')}`
          );
        }
      } catch (err) {
        allOk = false;
        console.error(`  FAILED to verify live schema: ${err.message}`);
      }
    }
    console.log(`\nEstimated total cost (if pricing env vars set): $${totalEstimate.toFixed(2)}`);
    if (!allOk) {
      console.error('\nDry run FAILED. Fix schema mismatches / connectivity before a real run.');
      process.exitCode = 1;
      return;
    }
    await writeDryRunState(args);
    console.log('\nDry run PASSED. You may now run without --dry-run.');
    return;
  }

  console.log(`Hard cap: $${HARD_CAP_USD.toFixed(2)} | Estimated total: $${totalEstimate.toFixed(2)}`);

  const results = [];
  let spentSoFar = 0;
  const runStamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (const model of MODELS) {
    const modelEstimate = estimateModelCostUsd(model, args.duration);
    if (spentSoFar + modelEstimate > HARD_CAP_USD) {
      console.error(
        `Skipping ${model.id}: running estimate $${(spentSoFar + modelEstimate).toFixed(2)} would exceed the $${HARD_CAP_USD.toFixed(2)} cap.`
      );
      continue;
    }

    const input = model.buildInput(args.startFrame, args.voiceover);
    console.log(`\nSubmitting ${model.id} (${model.endpoint})...`);
    const startedAt = Date.now();

    const submitted = await falSubmit(model.endpoint, input);
    const done = await falPollUntilDone(submitted.status_url);
    const result = await falFetchResult(submitted.response_url ?? done.response_url);
    const elapsedMs = Date.now() - startedAt;

    // UNVERIFIED: field names below (video.url, duration/duration_seconds,
    // and any cost/usage field) are best guesses at fal's output shape.
    const videoUrl = result?.video?.url ?? result?.output?.video?.url ?? null;
    const deliveredSeconds =
      result?.video?.duration ?? result?.duration_seconds ?? result?.duration ?? null;
    const actualCostFromApi = result?.usage?.cost_usd ?? result?.metrics?.cost_usd ?? null;
    const cost = actualCostFromApi ?? modelEstimate;
    const costIsEstimate = actualCostFromApi == null;

    spentSoFar += cost;

    let r2Url = null;
    if (videoUrl) {
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error(`Failed to download output video for ${model.id}: HTTP ${videoRes.status}`);
      const buf = Buffer.from(await videoRes.arrayBuffer());
      const key = `${args.outPrefix}${runStamp}/${model.id}.mp4`;
      r2Url = await uploadToR2(key, buf, 'video/mp4');
    } else {
      console.warn(`[warn] No video URL found in result for ${model.id}; raw result: ${JSON.stringify(result)}`);
    }

    results.push({
      id: model.id,
      endpoint: model.endpoint,
      videoUrl: r2Url ?? videoUrl,
      deliveredSeconds,
      cost,
      costIsEstimate,
      timeTakenMs: elapsedMs,
    });
  }

  console.log('\n--- Bake-off results ---');
  for (const r of results) {
    console.log(`\n${r.id} (${r.endpoint})`);
    console.log(`  video: ${r.videoUrl ?? '(none)'}`);
    console.log(`  delivered seconds: ${r.deliveredSeconds ?? '(unknown)'}`);
    console.log(`  cost: $${r.cost.toFixed(4)}${r.costIsEstimate ? ' (estimate - fal response had no cost field)' : ' (from fal response)'}`);
    console.log(`  time taken: ${(r.timeTakenMs / 1000).toFixed(1)}s`);
  }
  console.log(`\nTotal spend: $${spentSoFar.toFixed(2)} of $${HARD_CAP_USD.toFixed(2)} cap`);

  await logToSupabaseIfConfigured(
    results.map((r) => ({
      run_at: new Date().toISOString(),
      model_id: r.id,
      endpoint: r.endpoint,
      video_url: r.videoUrl,
      delivered_seconds: r.deliveredSeconds,
      cost_usd: r.cost,
      cost_is_estimate: r.costIsEstimate,
      time_taken_ms: r.timeTakenMs,
    }))
  );
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exitCode = 1;
});
