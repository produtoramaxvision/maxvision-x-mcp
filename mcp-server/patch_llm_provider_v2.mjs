/**
 * Patch llm-provider.js on VPS — migrate xSearch() to xAI Responses API.
 * Run: node patch_llm_provider_v2.mjs /app/dist/auth/llm-provider.js
 */
import { readFileSync, writeFileSync } from 'fs';

const target = process.argv[2] ?? '/app/dist/auth/llm-provider.js';
let src = readFileSync(target, 'utf8');
const original = src;

// 1. Add Responses API constants after ENDPOINTS definition
const endpointsMarker = `const ENDPOINTS = {`;
const endpointsBlock = src.indexOf(endpointsMarker);
if (endpointsBlock === -1) throw new Error('Could not find ENDPOINTS definition');

const endpointEnd = src.indexOf('\n};', endpointsBlock) + 3;
const afterEndpoints = src.slice(endpointEnd);

const responsesConst = `\nconst XAI_RESPONSES_ENDPOINT = 'https://api.x.ai/v1/responses';\nconst XAI_RESPONSES_DEFAULT_MODEL = 'grok-4.3';`;
src = src.slice(0, endpointEnd) + responsesConst + afterEndpoints;

// 2. Update DEFAULT_MODELS grok value
src = src.replace(
  /'grok-4-1-fast-non-reasoning'/g,
  `'grok-4.3'`
);
src = src.replace(
  /'x-ai\/grok-4\.1-fast'/g,
  `'x-ai/grok-4.3'`
);

// 3. Replace the xSearch function body
// Find async function xSearch
const xSearchStart = src.indexOf('async function xSearch(');
if (xSearchStart === -1) throw new Error('Could not find xSearch function');

// Find the matching closing brace
let braceDepth = 0;
let inFunction = false;
let funcEnd = -1;
for (let i = xSearchStart; i < src.length; i++) {
  if (src[i] === '{') { braceDepth++; inFunction = true; }
  else if (src[i] === '}') {
    braceDepth--;
    if (inFunction && braceDepth === 0) { funcEnd = i + 1; break; }
  }
}
if (funcEnd === -1) throw new Error('Could not find end of xSearch function');

// Check if there's an `export` keyword before async function xSearch
const exportPrefix = src.lastIndexOf('export ', xSearchStart);
const funcStart = (exportPrefix !== -1 && exportPrefix > xSearchStart - 10) ? exportPrefix : xSearchStart;

const newXSearch = `async function xSearch(args) {
    const apiKey = env.XAI_API_KEY;
    if (!apiKey) {
        throw new AppError('CONFIG_FAIL', 'XAI_API_KEY required for x_search (Layer A)');
    }
    const xSearchTool = { type: 'x_search' };
    if (args.allowedHandles?.length) xSearchTool['allowed_x_handles'] = args.allowedHandles;
    if (args.excludedHandles?.length) xSearchTool['excluded_x_handles'] = args.excludedHandles;
    if (args.fromDate) xSearchTool['from_date'] = args.fromDate;
    if (args.toDate) xSearchTool['to_date'] = args.toDate;
    const model = env.LLM_MODEL ?? XAI_RESPONSES_DEFAULT_MODEL;
    const body = {
        model,
        input: [{ role: 'user', content: args.query }],
        tools: [xSearchTool],
    };
    logger.info({ model, query: args.query.slice(0, 80), tool: xSearchTool }, 'x_search_responses_api');
    const res = await fetch(XAI_RESPONSES_ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: \`Bearer \${apiKey}\`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errBody = await res.text();
        throw new AppError('EXTERNAL_API_FAIL', \`grok Responses API \${res.status}: \${errBody.slice(0, 300)}\`, { provider: 'grok', status: res.status });
    }
    const json = await res.json();
    const output = json['output'];
    const message = output?.find(o => o.type === 'message');
    const textContent = message?.content?.find(c => c.type === 'output_text');
    const text = textContent?.text ?? '';
    return { text, raw: json };
}`;

// Replace from funcStart to funcEnd, preserving 'export ' prefix if present
const prefix = src.slice(funcStart, xSearchStart); // 'export ' or ''
src = src.slice(0, funcStart) + prefix + newXSearch + src.slice(funcEnd);

if (src === original) throw new Error('No changes were made — patch may have already been applied or markers not found');

writeFileSync(target, src, 'utf8');
const oldLen = original.length;
const newLen = src.length;
console.log(`PATCHED OK — ${target}`);
console.log(`  old: ${oldLen} chars → new: ${newLen} chars (delta: ${newLen - oldLen})`);
console.log(`  XAI_RESPONSES_ENDPOINT added: ${src.includes('XAI_RESPONSES_ENDPOINT')}`);
console.log(`  x_search Responses API: ${src.includes("'x_search'")}`);
console.log(`  input array: ${src.includes("input: [{ role: 'user'")}`);
console.log(`  output_text parse: ${src.includes("'output_text'")}`);
