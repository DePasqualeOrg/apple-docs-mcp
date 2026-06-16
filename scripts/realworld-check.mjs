/**
 * Real-world end-to-end check of the built MCP server against the LIVE Apple API.
 *
 * Spawns dist/index.js over stdio with a real MCP client, discovers WWDC IDs,
 * then runs all 18 tools across valid/filter/enum/error inputs. Every response is
 * scanned for rough-edge signatures (double-prefixed URLs, `[object Object]`,
 * broken `doc://` links, empty link targets, cryptic errors) and a summary of any
 * flags is printed at the end.
 *
 * This is NOT part of `pnpm test` (the unit suite mocks the network). It hits
 * developer.apple.com and must run inside the dev container, which has egress.
 *
 *   scripts/dx pnpm run check:live   # builds, then runs this
 *   scripts/dx node scripts/realworld-check.mjs   # run directly (needs a prior build)
 *
 * Run it after changes that touch fetching, parsing, formatting, the MCP wiring,
 * or the bundled WWDC data, to confirm the live server still behaves.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const V = 'https://developer.apple.com/documentation/swiftui/view';
const findings = [];

/** Scan rendered text for things that look wrong. */
function scan(label, text, { expectError = false } = {}) {
  const flags = [];
  const isErr = /(^|\n)Error:/.test(text) || text.startsWith('[isError]');
  if (expectError && !isErr) {flags.push('EXPECTED-ERROR-BUT-OK');}
  if (!expectError && isErr) {flags.push('UNEXPECTED-ERROR');}
  if (/https:\/\/developer\.apple\.com\/https?:\/\//.test(text)) {flags.push('DOUBLE-PREFIXED-URL');}
  if (/documentation\/doc:\/\//.test(text)) {flags.push('BROKEN-doc://-LINK');}
  if (/\bundefined\b/.test(text)) {flags.push('LITERAL-undefined');}
  if (/\bnull\b/.test(text)) {flags.push('LITERAL-null');}
  if (/\bNaN\b/.test(text)) {flags.push('NaN');}
  if (/\[object Object\]/.test(text)) {flags.push('object-Object');}
  if (/\]\(\s*\)/.test(text)) {flags.push('EMPTY-LINK-TARGET');}
  if (/\]\(#\)/.test(text)) {flags.push('PLACEHOLDER-#-LINK');}
  if (/error \d+\)/i.test(text) && /framework/i.test(text)) {flags.push('CRYPTIC-FRAMEWORK-ERROR');}
  if (/\n{4,}/.test(text)) {flags.push('EXCESSIVE-BLANK-LINES');}
  if (!expectError && text.trim().length < 40) {flags.push('SUSPICIOUSLY-SHORT');}
  if (flags.length) {findings.push({ label, flags });}
  return flags;
}

function render(res) {
  return (res?.isError ? '[isError] ' : '') + (res?.content ?? []).map((c) => c.text ?? '').join('\n');
}

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: { ...process.env, NODE_ENV: 'production', MCP_DEBUG: 'false' },
    stderr: 'inherit',
  });
  const client = new Client({ name: 'realworld-check', version: '0.0.0' }, { capabilities: {} });
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log(`connected; ${tools.length} tools advertised\n`);

  const call = async (name, args, opts = {}) => {
    const label = `${name} ${JSON.stringify(args)}`;
    const t = Date.now();
    let text;
    try {
      text = render(await client.callTool({ name, arguments: args }));
    } catch (e) {
      text = `[THREW] ${e?.message ?? e}`;
      findings.push({ label, flags: ['CLIENT-THREW'] });
    }
    const flags = scan(label, text, opts);
    const head = text.split('\n').filter((l) => l.trim()).slice(0, 4).join(' / ').slice(0, 240);
    console.log(`${flags.length ? '⚠ ' : '· '}${name} (${Date.now() - t}ms) ${flags.join(',')}`);
    console.log(`    ${head}`);
    return text;
  };

  // ── Discovery: extract a real WWDC video + topic id ──
  console.log('# discovery');
  const vids = await call('list_wwdc_videos', { year: '2025', limit: 3 });
  const topics = await call('browse_wwdc_topics', { includeVideos: false });
  const vm = vids.match(/wwdc(\d{4})\/(\d+)/) || vids.match(/(\d{4}).{0,40}?\b(\d{4,6})\b/);
  const year = vm?.[1] ?? '2025';
  const videoId = vm?.[2] ?? '10188';
  const tm = topics.match(/`([a-z0-9][a-z0-9-]{3,})`/i) || topics.match(/\(([a-z0-9-]{4,})\)/i);
  const topicId = tm?.[1] ?? 'swiftui-ui-frameworks';
  console.log(`  → using year=${year} videoId=${videoId} topicId=${topicId}\n`);

  console.log('# doc tools — valid');
  await call('search_apple_docs', { query: 'NavigationStack', type: 'all' });
  await call('search_apple_docs', { query: 'async sequence', type: 'documentation' });
  await call('search_apple_docs', { query: 'weather', type: 'sample' });
  await call('get_apple_doc_content', { url: V, includeRelatedApis: true, includeReferences: true, includeSimilarApis: true, includePlatformAnalysis: true });
  await call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/foundation/url' });
  await call('list_technologies', { category: 'graphics-and-games', language: 'swift', limit: 3 });
  await call('search_framework_symbols', { framework: 'swiftui', symbolType: 'protocol', namePattern: 'View*', limit: 5 });
  await call('search_framework_symbols', { framework: 'uikit', symbolType: 'class', language: 'occ', limit: 3 });
  await call('get_related_apis', { apiUrl: V });
  await call('resolve_references_batch', { sourceUrl: V, maxReferences: 5 });
  await call('resolve_references_batch', { sourceUrl: V, maxReferences: 5, filterByType: 'collection' });
  await call('get_platform_compatibility', { apiUrl: V, includeRelated: true });
  await call('find_similar_apis', { apiUrl: V, searchDepth: 'shallow' });
  await call('find_similar_apis', { apiUrl: V, searchDepth: 'deep' });
  await call('get_documentation_updates', { category: 'wwdc', year: '2025', limit: 5 });
  await call('get_documentation_updates', { searchQuery: 'swift', limit: 5 });
  await call('get_technology_overviews', { limit: 3 });
  await call('get_technology_overviews', { category: 'app-design-and-ui', platform: 'ios', limit: 3 });
  await call('get_sample_code', { framework: 'SwiftUI', limit: 3 });
  await call('get_sample_code', { beta: 'only', limit: 3 });
  await call('get_sample_code', { searchQuery: 'game', limit: 3 });

  console.log('\n# verify #3 fix: framework mode must honor includeRelated:false');
  const fwNoRel = await call('get_platform_compatibility', { apiUrl: V, compareMode: 'framework', includeRelated: false });
  if (fwNoRel.includes('Related APIs Compatibility')) {findings.push({ label: 'platform compat framework mode', flags: ['#3-REGRESSION: related included despite includeRelated:false'] });}

  console.log('\n# wwdc tools — valid');
  await call('list_wwdc_videos', { topic: 'swiftui', hasCode: true, limit: 3 });
  await call('search_wwdc_content', { query: 'async', searchIn: 'both', limit: 3 });
  await call('search_wwdc_content', { query: 'actor', searchIn: 'code', language: 'swift', limit: 3 });
  await call('get_wwdc_video', { year, videoId, includeTranscript: true, includeCode: true });
  await call('get_wwdc_code_examples', { framework: 'SwiftUI', year: '2025', limit: 3 });
  await call('browse_wwdc_topics', { topicId, limit: 3 });
  await call('find_related_wwdc_videos', { videoId, year, limit: 5 });

  console.log('\n# error / edge cases (errors expected)');
  await call('search_apple_docs', { query: '', type: 'all' }, { expectError: true });
  await call('search_apple_docs', { query: 'qzxnonexistentterm12345', type: 'all' }); // no-results, not error
  await call('search_apple_docs', { query: 'Tëxt 日本語 <script>alert(1)</script>', type: 'all' });
  await call('get_apple_doc_content', { url: 'not-a-url' }, { expectError: true });
  await call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/swiftui/thisdoesnotexist99999' }, { expectError: true });
  await call('get_apple_doc_content', { url: 'https://example.com/foo' }, { expectError: true });
  await call('get_related_apis', { apiUrl: 'https://developer.apple.com/documentation/swiftui/thisdoesnotexist99999' }, { expectError: true });
  await call('search_framework_symbols', { framework: 'nonexistentframework99999', limit: 3 });
  await call('list_technologies', { category: 'totally-fake-category-xyz', limit: 3 });
  await call('get_sample_code', { framework: 'NonexistentFW99999', limit: 3 });
  await call('list_wwdc_videos', { year: '1999', limit: 3 });
  await call('get_wwdc_video', { year: '2025', videoId: '999999' }, { expectError: true });

  await client.close();

  console.log('\n══════════ ROUGH EDGES SUMMARY ══════════');
  if (!findings.length) {
    console.log('none detected');
  } else {
    for (const f of findings) {console.log(`⚠ ${f.flags.join(', ')}\n    ${f.label}`);}
    console.log(`\n${findings.length} flagged.`);
  }
}

main().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(1); });
