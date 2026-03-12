#!/usr/bin/env node
/**
 * DECP Platform — 3-Minute Architecture Demo
 * ============================================
 * Logs in as Omar Hassan (alumni), demonstrates all 8 capability areas,
 * sends messages to Liam Foster (visible on mobile), then cleans up
 * everything created so the demo can be re-run idempotently.
 *
 * Usage: node scripts/demo.js
 *        (or via ./run-demo.sh)
 */

const { chromium } = require('playwright');
const https = require('https');
const http  = require('http');

// ── Config ──────────────────────────────────────────────────────────────────
const WEB     = 'http://localhost:3100';
const GATEWAY = 'http://localhost:8082';
const EMAIL   = 'omar.hassan@decp.io';
const PASS    = 'Pass1234';

// State — filled during the demo, used for cleanup
const state = {
  token     : null,
  postId    : null,
  jobId     : null,
  eventId   : null,
  projectId : null,
  msgIds    : [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  process.stdout.write(`\n  ▶  ${msg}\n`);
}

function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function wait(page, ms = 800) {
  await page.waitForTimeout(ms);
}

async function nav(page, label) {
  await page.getByRole('link', { name: label }).click();
  await page.waitForLoadState('networkidle');
  await wait(page, 600);
}

function apiCall(method, path, body, token) {
  return new Promise((resolve) => {
    const data   = body ? JSON.stringify(body) : null;
    const url    = new URL(GATEWAY + path);
    const opts   = {
      hostname : url.hostname,
      port     : url.port || 8082,
      path     : url.pathname + url.search,
      method,
      headers  : {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data  ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    if (data) req.write(data);
    req.end();
  });
}

let _myUserId = null;
async function getMyUserId() {
  if (_myUserId) return _myUserId;
  const r = await apiCall('GET', '/api/v1/users/me', null, state.token);
  _myUserId = r?.data?._id ?? '';
  return _myUserId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Demo sections
// ═══════════════════════════════════════════════════════════════════════════════

async function sectionLogin(page) {
  log('LOGIN — Omar Hassan (Alumni)');
  await page.goto(`${WEB}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await wait(page, 500);

  await page.locator('input[type="email"]').fill(EMAIL);
  await wait(page, 300);
  await page.locator('input[type="password"]').fill(PASS);
  await wait(page, 400);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`${WEB}/**`, { waitUntil: 'networkidle' });
  await wait(page, 1200);

  // Extract token from Zustand localStorage
  try {
    const tok = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('auth-storage');
        return raw ? JSON.parse(raw)?.state?.token : null;
      } catch { return null; }
    });
    if (tok) state.token = tok;
  } catch {}

  log('Logged in ✓');
}

async function sectionFeed(page) {
  log('FEED — Social posts, likes, comments');
  await nav(page, 'Feed');

  // Scroll to show existing posts
  await page.mouse.wheel(0, 500);
  await wait(page, 700);
  await page.mouse.wheel(0, -500);
  await wait(page, 500);

  // Create a new post
  log('Creating a new post…');
  const postBox = page.getByPlaceholder("What's on your mind?");
  await postBox.click();
  await wait(page, 300);
  await postBox.fill(
    "Great to be back on the DECP platform! " +
    "This alumni-student connection tool is exactly what our department needed. " +
    "Students — check out the Jobs board, I've just posted a new opening. " +
    "#DEC #Alumni #TechCareers"
  );
  await wait(page, 700);

  // Submit — button text is "Post" (with Send icon)
  await page.locator('button.btn-primary', { hasText: 'Post' }).last().click();
  await page.waitForLoadState('networkidle');
  await wait(page, 1200);

  // Capture post ID for cleanup
  try {
    const myId = await getMyUserId();
    const r    = await apiCall('GET', `/api/v1/feed/posts?limit=5&authorId=${myId}`, null, state.token);
    const posts = Array.isArray(r?.data) ? r.data : [];
    if (posts.length) {
      state.postId = posts[0]._id;
      log(`Post created (id=${state.postId}) ✓`);
    }
  } catch (e) { log(`Could not capture post id: ${e.message}`); }

  // Like the first post visible
  await wait(page, 400);
  await page.mouse.wheel(0, 200);
  await wait(page, 400);
  try {
    // Like button contains Heart SVG — find buttons that contain an svg inside a post card
    const hearts = await page.locator('article button, .post button, [class*="post"] button').all();
    if (hearts.length) { await hearts[0].click(); await wait(page, 600); log('Liked a post ✓'); }
  } catch {}

  await wait(page, 400);
}

async function sectionJobs(page) {
  log('JOBS — Browse listings and apply for a role');
  await nav(page, 'Jobs');

  // Scroll through existing jobs
  await page.mouse.wheel(0, 500);
  await wait(page, 700);
  await page.mouse.wheel(0, -500);
  await wait(page, 500);

  // Click Apply on the first job
  log('Opening Apply modal…');
  try {
    await page.getByRole('button', { name: 'Apply' }).first().click();
    await wait(page, 800);

    // Fill cover letter
    const clInput = page.getByPlaceholder("Tell us why you're a great fit for this role...");
    await clInput.fill(
      "I am a final-year Software Engineering student with strong full-stack skills in Node.js, " +
      "React, and cloud infrastructure. I have shipped several open source projects and won three " +
      "hackathons this year. I am excited to apply what I have learned in a real-world environment."
    );
    await wait(page, 400);

    // CV URL
    await page.getByPlaceholder('https://drive.google.com/...').fill('https://cv.example.com/omar-hassan');
    await wait(page, 300);

    // Submit
    await page.getByRole('button', { name: 'Submit Application' }).click();
    await page.waitForLoadState('networkidle');
    await wait(page, 1000);
    log('Application submitted ✓');

    // Close modal if still open
    const overlay = page.locator('.modal-overlay');
    if (await overlay.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await wait(page, 400);
    }
  } catch (e) { log(`Apply skipped: ${e.message}`); }

  // Ensure any open modal is dismissed before navigating away
  await page.keyboard.press('Escape');
  await wait(page, 400);

  await wait(page, 500);
}

async function sectionEvents(page) {
  log('EVENTS — RSVP to a department event');
  await nav(page, 'Events');
  await wait(page, 700);

  // Pre-capture event ID
  try {
    const r      = await apiCall('GET', '/api/v1/events?limit=10', null, state.token);
    const events = Array.isArray(r?.data) ? r.data : [];
    if (events.length) state.eventId = events[0]._id;
  } catch {}

  try {
    await page.getByRole('button', { name: 'RSVP' }).first().click();
    await wait(page, 1000);
    log(`RSVPed to event (id=${state.eventId}) ✓`);
  } catch (e) { log(`RSVP skipped: ${e.message}`); }

  await wait(page, 400);
}

async function sectionResearch(page) {
  log('RESEARCH — Join a collaboration project');
  await nav(page, 'Research');
  await wait(page, 700);

  // Find a project Omar hasn't joined
  try {
    const r       = await apiCall('GET', '/api/v1/research?limit=10', null, state.token);
    const projects = Array.isArray(r?.data) ? r.data : [];
    const myId    = await getMyUserId();
    const target  = projects.find(p => !p.collaboratorIds?.includes(myId) && p.creatorId !== myId);
    if (target) state.projectId = target._id;
  } catch {}

  try {
    const joinBtns = await page.getByRole('button', { name: 'Join' }).all();
    if (joinBtns.length) {
      await joinBtns[0].click();
      await wait(page, 1000);
      log(`Joined research project (id=${state.projectId}) ✓`);
    } else {
      log('No Join buttons visible');
    }
  } catch (e) { log(`Research join skipped: ${e.message}`); }

  await wait(page, 400);
}

async function sectionMessages(page) {
  log('MESSAGES — Sending to Liam Foster (visible on mobile)');
  await nav(page, 'Messages');
  await wait(page, 700);

  // Find Liam's user ID
  let liamId   = null;
  let liamName = 'Liam Foster';
  try {
    const r = await apiCall('GET', '/api/v1/users/search?q=Liam', null, state.token);
    const users = Array.isArray(r?.data) ? r.data : [];
    const liam  = users.find(u => u.name?.toLowerCase().includes('liam'));
    if (liam) { liamId = liam._id; liamName = liam.name; }
    log(`Liam found → id=${liamId}`);
  } catch (e) { log(`Could not find Liam: ${e.message}`); }

  // Try clicking existing conversation row with Liam
  let opened = false;
  try {
    await page.getByText(liamName, { exact: false }).first().click();
    await wait(page, 900);
    opened = true;
  } catch {}

  // Otherwise open New Conversation modal
  if (!opened) {
    try {
      await page.getByRole('button', { name: 'New Conversation' }).first().click();
      await wait(page, 700);
      await page.getByPlaceholder('Search by name…').fill('Liam');
      await wait(page, 900);
      await page.getByText(liamName, { exact: false }).first().click();
      await wait(page, 700);
    } catch (e) {
      log(`New conversation modal failed: ${e.message}`);
      if (liamId) {
        await page.goto(`${WEB}/messages/${liamId}`);
        await page.waitForLoadState('networkidle');
        await wait(page, 800);
      }
    }
  }

  // Send 3 messages
  const messagesToSend = [
    "Hey Liam! 👋 Great to connect here. How's the final year project going?",
    "I just posted a Software Engineering Internship at Hassan Consulting — I think it's a perfect fit for you. Check the Jobs board!",
    "Let me know if you'd like to chat about it. Happy to review your CV too. This is exactly what DECP was built for 🎓",
  ];

  let msgInput = null;
  for (const sel of [
    'textarea[placeholder*="Type a message"]',
    'textarea[placeholder*="message"]',
    'textarea',
  ]) {
    const el = page.locator(sel).last();
    if (await el.isVisible().catch(() => false)) { msgInput = el; break; }
  }

  if (!msgInput) {
    log('Could not find message input — skipping messages');
    return;
  }

  for (let i = 0; i < messagesToSend.length; i++) {
    await wait(page, 400);
    await msgInput.click();
    await msgInput.fill(messagesToSend[i]);
    await wait(page, 500);
    await page.keyboard.press('Enter');
    await wait(page, 900);
    log(`Sent message ${i + 1}/3 ✓`);
  }

  // Capture message IDs for cleanup
  try {
    if (liamId) {
      const r    = await apiCall('GET', `/api/v1/messages/conversation/${liamId}?limit=20`, null, state.token);
      const msgs = Array.isArray(r?.data) ? r.data : [];
      const myId = await getMyUserId();
      for (const m of msgs) {
        if (m.senderId === myId) {
          for (const demo of messagesToSend) {
            if (m.content?.startsWith(demo.slice(0, 30)) && !state.msgIds.includes(m._id)) {
              state.msgIds.push(m._id);
            }
          }
        }
      }
    }
  } catch (e) { log(`Could not capture message ids: ${e.message}`); }

  await wait(page, 700);
  log("Messages sent — visible on Liam's mobile app ✓");
}

async function sectionNotifications(page) {
  log('NOTIFICATIONS — Real-time event-driven alerts');
  await nav(page, 'Notifications');
  await wait(page, 700);
  await page.mouse.wheel(0, 400);
  await wait(page, 500);
  await page.mouse.wheel(0, -400);
  await wait(page, 400);
}

async function sectionProfile(page) {
  log('PROFILE — Alumni profile with followers');
  await nav(page, 'Profile');
  await wait(page, 700);
  await page.mouse.wheel(0, 400);
  await wait(page, 600);
  await page.mouse.wheel(0, -400);
  await wait(page, 500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanup() {
  console.log('\n' + '═'.repeat(60));
  console.log('  CLEANUP — removing demo data for idempotency');
  console.log('═'.repeat(60));

  const tok = state.token;
  if (!tok) { console.log('  No token — skipping cleanup'); return; }

  const del = async (label, path) => {
    const r  = await apiCall('DELETE', path, null, tok);
    const ok = r?.success;
    console.log(`  ${label.padEnd(18)} → ${ok ? 'deleted ✓' : 'failed: ' + JSON.stringify(r)}`);
  };

  if (state.postId)    await del(`Post ${state.postId.slice(-6)}`,    `/api/v1/feed/posts/${state.postId}`);
  if (state.jobId)     await del(`Job ${state.jobId.slice(-6)}`,      `/api/v1/jobs/${state.jobId}`);
  if (state.eventId)   await del(`RSVP ${state.eventId.slice(-6)}`,   `/api/v1/events/${state.eventId}/rsvp`);
  if (state.projectId) await del(`Research ${state.projectId.slice(-6)}`, `/api/v1/research/${state.projectId}/leave`);
  for (const mid of state.msgIds) {
    await del(`Msg ${mid.slice(-6)}`, `/api/v1/messages/${mid}`);
  }

  const any = state.postId || state.jobId || state.eventId || state.projectId || state.msgIds.length;
  if (!any) console.log('  Nothing to clean up.');

  console.log('\n  Demo cleanup complete — safe to run again.\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-flight
// ═══════════════════════════════════════════════════════════════════════════════

async function checkServices() {
  console.log('\n  Checking services…');

  const check = (url) => new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ ok: res.statusCode < 500, code: res.statusCode });
    });
    req.on('error', () => resolve({ ok: false, code: 0 }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, code: 0 }); });
  });

  const gw  = await check(`${GATEWAY}/health`);
  console.log(`  Gateway  ${GATEWAY}/health → ${gw.code}`);
  if (!gw.ok) {
    console.error('  ✗ Gateway not healthy. Run: docker compose up -d');
    process.exit(1);
  }

  const web = await check(`${WEB}`);
  console.log(`  Web app  ${WEB} → ${web.code}`);
  if (!web.ok) {
    console.error(`  ✗ Cannot reach web app on ${WEB}. Run: cd web && npm run dev`);
    process.exit(1);
  }

  console.log('  All services OK\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  DECP Platform — Architecture Demo                      ║');
  console.log('║  CO528 Applied Software Architecture                     ║');
  console.log('║                                                          ║');
  console.log('║  User: Omar Hassan (Alumni)  →  omar.hassan@decp.io      ║');
  console.log('║  Mobile: Log in as Liam Foster  →  liam.foster@decp.io   ║');
  console.log('║          Password: Pass1234                              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await checkServices();

  // Get API token for cleanup
  const loginRes = await apiCall('POST', '/api/v1/auth/login', { email: EMAIL, password: PASS });
  state.token    = loginRes?.data?.accessToken ?? null;
  if (state.token) console.log('  API token obtained ✓\n');
  else             console.log('  Warning: could not get API token — cleanup may fail\n');

  const start   = Date.now();
  let   browser = null;

  try {
    browser = await chromium.launch({
      headless : false,
      slowMo   : 100,
      args     : ['--start-maximized'],
    });

    const ctx  = await browser.newContext({
      viewport : { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();

    // ── Sections ──────────────────────────────────────────────────────────
    await sectionLogin(page);
    await sectionFeed(page);
    await sectionJobs(page);
    await sectionEvents(page);
    await sectionResearch(page);
    await sectionMessages(page);
    await sectionNotifications(page);
    await sectionProfile(page);

    const elapsed = (Date.now() - start) / 1000;
    console.log(`\n  ✅  Demo complete in ${elapsed.toFixed(0)}s (${(elapsed/60).toFixed(1)} min)`);
    console.log('  Holding 4s before cleanup…');
    await wait(page, 4000);

  } catch (e) {
    console.error(`\n  ✗  Demo error: ${e.message}`);
    console.error(e.stack);
  } finally {
    if (browser) await browser.close();
  }

  await cleanup();
}

main().catch(e => { console.error(e); process.exit(1); });
