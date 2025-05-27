import { config } from 'dotenv';
config();

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY as string;

async function main() {
  if (typeof fetch === 'undefined') {
    // @ts-ignore
    global.fetch = (await import('node-fetch')).default;
  }

  const devUuid = process.env.TEST_DEV_UUID;
  const agentUrl = devUuid
    ? `http://localhost:3000/portal/app/agent?dev_uuid=${encodeURIComponent(devUuid)}`
    : 'http://localhost:3000/portal/app/agent';
  try {
    const agentResp = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        app_uuid: process.env.TEST_APP_UUID,
        fname: process.env.TEST_AGENT_FNAME,
        metadata: process.env.TEST_AGENT_METADATA ? JSON.parse(process.env.TEST_AGENT_METADATA) : {},
      }),
    });
    if (!agentResp.ok) {
      const errorText = await agentResp.text();
      console.error('Error creating agent:', agentResp.status, agentResp.statusText);
      console.error('Raw response:', errorText);
      throw new Error(`HTTP ${agentResp.status}: ${agentResp.statusText}`);
    }
    const agentData = await agentResp.json();
    console.log('Created agent response:', agentData);
  } catch (err) {
    console.error('Error creating agent:', err);
    return;
  }
}

main();
