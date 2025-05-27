import { config } from 'dotenv';
config();

const API_URL = 'http://localhost:3000/portal';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY as string;
const fid = BigInt(process.env.TEST_FID || 1079126);

async function checkTestEndpoint(path: string) {
  const url = `${API_URL.replace(/\/$/, '')}${path}`;
  console.log(`Testing endpoint: ${url}`);
  try {
    const res = await fetch(url, {
      headers: { 'x-api-key': NEYNAR_API_KEY },
    });
    const rawText = await res.text();
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (jsonErr) {
      console.error(`❌ Error parsing JSON from test endpoint ${path}:`, jsonErr);
      console.error(`❌ Status: ${res.status} ${res.statusText}`);
      return false;
    }
    if (json.ok) {
      console.log(`✅ Test endpoint ${path} OK:`, json);
      return true;
    } else {
      console.error(`❌ Test endpoint ${path} did not return ok:`, json);
      console.error(`❌ Status: ${res.status} ${res.statusText}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error hitting test endpoint ${path}:`, err);
    return false;
  }
}

async function main() {
  if (typeof fetch === 'undefined') {
    // @ts-ignore
    global.fetch = (await import('node-fetch')).default;
  }

  // Optionally enable endpoint tests with --endpoints
  const enableEndpoints = process.argv.includes('--endpoints');
  if (enableEndpoints) {
    const testPaths = ['/test', '/app/test', '/app/agent/test'];
    for (const path of testPaths) {
      const ok = await checkTestEndpoint(path);
      if (!ok) {
        console.error('Aborting due to failed test endpoint:', path);
        return;
      }
    }
  } else {
    console.log('Endpoint tests are disabled. Use --endpoints to enable.');
  }

  // Always do the bulk fetch
  try {
    const neynarUrl = `http://localhost:3000/v2/farcaster/user/bulk?fids=${fid.toString()}`;
    const neynarResp = await fetch(neynarUrl, {
      headers: { 'x-api-key': NEYNAR_API_KEY },
    });
    const neynarData = await neynarResp.json();
    console.log('Neynar bulk user response:', neynarData);
  } catch (err) {
    console.error('Error fetching Neynar bulk user:', err);
  }
}

main();
