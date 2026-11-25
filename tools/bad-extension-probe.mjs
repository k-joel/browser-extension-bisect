import process from 'node:process';
import { BAD_EXTENSION_MARKER, launchTestBrowser, readBadExtensionMarker } from '../tests/e2e/harness.mjs';
import { readBadExtensionDir } from '../tests/e2e/real-extensions.mjs';

const BROWSERS = ['chrome', 'firefox'];
const EXPECTATIONS = ['active', 'inactive'];

const USAGE = `Usage: node tools/bad-extension-probe.mjs --url=<url> [options]

Answers one question with the bad extension's own machine-readable marker: is a faulty
extension affecting this page right now? It never names an extension — use the bisect
for that. Exits 0 when the observed symptom matches --expect.

Options:
  --url=<url>                 Page to load (required)
  --browser=<chrome|firefox>  Browser to use (default: chrome)
  --extension=<path>          Built bad extension (default: bad_extension/dist/<browser target>)
  --expect=<active|inactive>  Fail unless the marker matches (default: active)
  --json                      Print one JSON verdict
  --headed                    Show the browser window
  --help                      Print this text
`;

function parseArgs(argv) {
  const options = {
    url: null,
    browser: 'chrome',
    extension: null,
    expect: 'active',
    json: false,
    headed: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--headed') options.headed = true;
    else if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
    else if (arg.startsWith('--browser=')) options.browser = arg.slice('--browser='.length);
    else if (arg.startsWith('--extension=')) options.extension = arg.slice('--extension='.length);
    else if (arg.startsWith('--expect=')) options.expect = arg.slice('--expect='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.help) return options;
  if (options.url === null || options.url.length === 0) throw new Error('--url is required');
  if (!BROWSERS.includes(options.browser)) throw new Error(`Invalid --browser value: ${options.browser}`);
  if (!EXPECTATIONS.includes(options.expect)) throw new Error(`Invalid --expect value: ${options.expect}`);
  return options;
}

async function probe(options) {
  const extensionDir = options.extension ?? readBadExtensionDir(options.browser);
  const session = await launchTestBrowser({ browserName: options.browser, headless: !options.headed });
  let page = null;

  try {
    await session.installExtensionPaths([extensionDir]);

    page = await session.newPage();
    await page.goto(options.url, { waitUntil: 'domcontentloaded' });

    // `document_start` runs before `DOMContentLoaded`; give a slow page a moment to settle
    // so an "inactive" answer means absent rather than not-yet-injected.
    const deadline = Date.now() + 10000;
    let marker = await readBadExtensionMarker(page);
    while (marker.attribute !== BAD_EXTENSION_MARKER.value && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      marker = await readBadExtensionMarker(page);
    }

    const active = marker.attribute === BAD_EXTENSION_MARKER.value;
    return {
      ok: options.expect === (active ? 'active' : 'inactive'),
      active,
      expected: options.expect,
      url: options.url,
      browser: options.browser,
      extension: extensionDir,
      marker: {
        attribute: marker.attribute,
        banner: marker.bannerText,
        meta: marker.meta,
      },
    };
  } finally {
    if (page !== null) await page.close().catch(() => undefined);
    await session.close().catch(() => undefined);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const verdict = await probe(options);

  if (options.json) {
    console.log(JSON.stringify(verdict, null, 2));
  } else {
    console.log(
      `${verdict.ok ? 'PASS' : 'FAIL'} ${verdict.browser}: faulty extension is ${verdict.active ? 'active' : 'inactive'}`,
    );
    console.log(`  url:     ${verdict.url}`);
    console.log(`  expect:  ${verdict.expected}`);
    console.log(`  banner:  ${verdict.marker.banner ?? '(absent)'}`);
    console.log(`  marker:  ${verdict.marker.attribute ?? '(absent)'}`);
  }

  return verdict.ok ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
