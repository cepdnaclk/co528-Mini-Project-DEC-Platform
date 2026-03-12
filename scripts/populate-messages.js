/**
 * Phase 3: Seed all conversations with fresh tokens
 */
const axios = require('axios');
const BASE = 'http://localhost:8082';
const PASS = 'Pass1234';
const api = (token) => axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function login(email, password = PASS) {
  const r = await axios.post(`${BASE}/api/v1/auth/login`, { email, password }, { validateStatus: () => true });
  if (!r.data.success) throw new Error(`Login failed: ${email}: ${JSON.stringify(r.data)}`);
  return r.data.data;
}

const CONVERSATIONS = [
  {
    from: 'liam.foster@decp.io', to: 'sarah.chen@decp.io',
    messages: [
      { sender: 'liam.foster@decp.io', content: "Hi Sarah! I saw your post about system design interviews. I'm preparing for my Google interview next month and really struggling with capacity estimation. Any advice on where to start?" },
      { sender: 'sarah.chen@decp.io', content: "Hey Liam! Great question. The key is building mental models for common numbers: 1 million users → ~12 req/s average, 1 GB ≈ 10^9 bytes, disk write ~100MB/s, network ~1Gbps. Memorise these and estimation becomes much easier." },
      { sender: 'liam.foster@decp.io', content: "That's really helpful, thank you! Do you have a framework you'd recommend for structuring the answer?" },
      { sender: 'sarah.chen@decp.io', content: "Yes! I always do: (1) clarify scale, (2) estimate storage, (3) estimate throughput, (4) identify bottlenecks. Keep it conversational — interviewers want to see your thinking, not just the answer. Also happy to do a mock session if you want?" },
      { sender: 'liam.foster@decp.io', content: "That would be amazing! Would next Tuesday work? I'm free from 2pm." },
      { sender: 'sarah.chen@decp.io', content: "Tuesday 3pm works perfectly for me. I'll send a Google Meet link closer to the time. Come prepared with a system you know well that you'd want to design — it works better than an unfamiliar example." },
    ]
  },
  {
    from: 'priya.sharma@decp.io', to: 'aisha.patel@decp.io',
    messages: [
      { sender: 'priya.sharma@decp.io', content: "Dr. Patel! Congratulations on the ICML paper — I read the preprint and the cross-lingual transfer results are really impressive. I'm working on something adjacent and wondering if you'd be open to a chat?" },
      { sender: 'aisha.patel@decp.io', content: "Thank you Priya! Of course, always happy to talk research. What are you working on?" },
      { sender: 'priya.sharma@decp.io', content: "I'm trying to apply causal intervention methods to improve cross-lingual coreference — the idea is to disentangle semantic and syntactic representations for more robust transfer. Still very early but I think there's something there." },
      { sender: 'aisha.patel@decp.io', content: "This is very timely — we just started a project on exactly this intersection. The challenge is defining what 'intervention' means in a multilingual setting where the causal graph changes across languages. Have you read the Feder et al. survey on causality in NLP?" },
      { sender: 'priya.sharma@decp.io', content: "Yes, it's what got me thinking about this direction! Would you be open to me joining your research group for this semester?" },
      { sender: 'aisha.patel@decp.io', content: "Absolutely — let's set up a proper meeting with the team. Are you free Fridays? We do our weekly group meeting at 11am. Come this Friday and see if it's a fit before committing." },
    ]
  },
  {
    from: 'omar.hassan@decp.io', to: 'marcus.t@decp.io',
    messages: [
      { sender: 'omar.hassan@decp.io', content: "Hi Marcus, I'm applying for the PM internship at Stripe. I have a strong engineering background but I'm making the switch to product. Any tips on what Stripe looks for specifically?" },
      { sender: 'marcus.t@decp.io', content: "Hey Omar! Great that you're applying. Stripe looks for people who can go deep technically AND communicate clearly to non-technical audiences. The case study round will test your analytical thinking — make sure you quantify everything and clearly state your assumptions." },
      { sender: 'omar.hassan@decp.io', content: "That's useful. For the case study, should I focus more on the user research side or the metrics side?" },
      { sender: 'marcus.t@decp.io', content: "Both matter but Stripe is very metric-driven. Always anchor your decisions to numbers. If you say 'improve developer experience', define how you'd measure it. Vague answers don't land here." },
      { sender: 'omar.hassan@decp.io', content: "Got it. One more question — I see the JD mentions the Developer Experience team specifically. Which team would you recommend for an engineer trying to break into PM?" },
      { sender: 'marcus.t@decp.io', content: "DevEx is fantastic for an engineer transitioning to PM — you'd still be close to the technical details. Mention in your cover letter why developer tooling excites you specifically." },
    ]
  },
  {
    from: 'sophie.w@decp.io', to: 'elena.r@decp.io',
    messages: [
      { sender: 'sophie.w@decp.io', content: "Hi Elena! I saw your post about data science portfolios and it really resonated. I'm applying for data science roles at fintech companies and wondering if you'd have 20 minutes to look at my portfolio?" },
      { sender: 'elena.r@decp.io', content: "Of course Sophie! Send it over and I'll take a look before we chat. I do portfolio reviews the last Friday of the month but I can make time for you before that." },
      { sender: 'sophie.w@decp.io', content: "Thank you so much! The main project is a customer lifetime value model I built for a local e-commerce company. I'm quite proud of the feature engineering but I'm not sure if the business framing is strong enough." },
      { sender: 'elena.r@decp.io', content: "CLV is a great choice — it's directly business-relevant. The key question: can you articulate the expected ROI of using your model versus the status quo?" },
      { sender: 'sophie.w@decp.io', content: "I have the numbers — the model would reduce churn-related revenue loss by around 18% based on back-testing. I just wasn't sure how prominently to feature that in the write-up." },
      { sender: 'elena.r@decp.io', content: "Lead with that number. Literally the first sentence: 'I built a model that reduces churn revenue loss by 18%.' Everything else is the supporting story. Data scientists bury their results — don't do that. Send me the GitHub link!" },
    ]
  },
  {
    from: 'ethan.kim@decp.io', to: 'james.obrien@decp.io',
    messages: [
      { sender: 'ethan.kim@decp.io', content: "James, I've been following NexaTech for a while. Congratulations on the Series A! I'm really interested in the Backend Engineer role. I've been building a Kubernetes operator in Go for my dissertation — is that the kind of thing that would be relevant?" },
      { sender: 'james.obrien@decp.io', content: "Ethan — yes, absolutely relevant! A custom Kubernetes operator is non-trivial and shows real Go and cloud-native understanding. Tell me more about what the operator does?" },
      { sender: 'ethan.kim@decp.io', content: "It's a stateful workload operator for distributed ML training jobs — it handles dynamic scaling of parameter servers, automatic fault recovery, and checkpointing to S3. It uses the controller-runtime library and I wrote a custom CRD schema." },
      { sender: 'james.obrien@decp.io', content: "OK I'm impressed. That's genuinely production-grade work. Please apply through the jobs board and mention this project in detail. I'll flag your application personally to the hiring team." },
      { sender: 'ethan.kim@decp.io', content: "Yes! It's public on GitHub under ethan-kim-dev/k8s-ml-operator. Thank you so much James — this means a lot!" },
      { sender: 'james.obrien@decp.io', content: "Just had a look — really solid code quality and the README is excellent. Apply today. We might fast-track you to the technical round directly. Welcome aboard (provisionally 😄)." },
    ]
  },
  {
    from: 'liam.foster@decp.io', to: 'omar.hassan@decp.io',
    messages: [
      { sender: 'liam.foster@decp.io', content: "Mate your hackathon win was insane. The sign language thing is genuinely cool. Are you actually going to build it out?" },
      { sender: 'omar.hassan@decp.io', content: "We're thinking about it! A few deaf advocacy groups reached out after we posted the GitHub repo. Need to figure out if it's viable as a startup or just a very good open source project." },
      { sender: 'liam.foster@decp.io', content: "Have you spoken to Chloe? She's the PM Society president and she'd probably have thoughts on the startup vs open source question." },
      { sender: 'omar.hassan@decp.io', content: "Good shout. Hey are you going to the career fair in two weeks? Should we do a group trip?" },
      { sender: 'liam.foster@decp.io', content: "100% yes. I need to talk to the Google recruiters. Want to grab lunch before and do a quick mock interview prep session?" },
      { sender: 'omar.hassan@decp.io', content: "Perfect. Noon on the career fair day, the usual café? I'll let Ethan and Sophie know too." },
    ]
  },
  {
    from: 'maya.patel@decp.io', to: 'priya.sharma@decp.io',
    messages: [
      { sender: 'maya.patel@decp.io', content: "Priya! Congratulations on the EMNLP acceptance — that's massive for a solo paper! Did you submit it as a workshop paper or main conference?" },
      { sender: 'priya.sharma@decp.io', content: "Workshop paper! Still very happy though — it's my first peer-reviewed publication. Are you applying for PhDs this cycle?" },
      { sender: 'maya.patel@decp.io', content: "I'm already in one! Just started my first year. The freedom is unlike anything in undergrad but the pressure to produce original work is real." },
      { sender: 'priya.sharma@decp.io', content: "Oh wow! I didn't realise you'd already started. What's your research on?" },
      { sender: 'maya.patel@decp.io', content: "Fairness and causality in hiring algorithms — can we use causal methods to detect and mitigate discrimination in automated decision systems." },
      { sender: 'priya.sharma@decp.io', content: "That sounds so important right now. If you ever want a second pair of eyes on anything, I'd love to read it." },
    ]
  },
  {
    from: 'anika.gupta@decp.io', to: 'chloe.zhang@decp.io',
    messages: [
      { sender: 'anika.gupta@decp.io', content: "Chloe! I loved your post on product lessons from running the society. The 'users lie' point is so true — I learned that the hard way on a UX project where every user said they'd use the dark mode and then exactly zero of them did." },
      { sender: 'chloe.zhang@decp.io', content: "EXACTLY. I've started doing usability sessions where I just watch people use the thing without asking any questions. You learn more in 20 minutes of observation than in an hour of interviews." },
      { sender: 'anika.gupta@decp.io', content: "That's a great approach. Have you tried unmoderated remote testing? I've been using Maze for a project and the async nature means you get more honest behaviour." },
      { sender: 'chloe.zhang@decp.io', content: "I haven't but I should! I've been using Hotjar for heatmaps but it feels a bit indirect. The problem is we never have enough users for statistical significance." },
      { sender: 'anika.gupta@decp.io', content: "Story of my life 😄 Hey, are you coming to the symposium? I'm presenting my accessibility audit tool." },
      { sender: 'chloe.zhang@decp.io', content: "Yes! I'm coming to support Ryan's presentation too. Shall we grab a coffee beforehand and go through your pitch? I might have useful input on the business framing." },
    ]
  },
  {
    from: 'jake.morrison@decp.io', to: 'ryan.oconnor@decp.io',
    messages: [
      { sender: 'jake.morrison@decp.io', content: "Ryan, saw your post about the distributed KV store. I've been thinking about building something similar for my security research — specifically for storing audit logs in a tamper-evident way. Is your code open source?" },
      { sender: 'ryan.oconnor@decp.io', content: "Yes! It's on GitHub, MIT licensed. The tamper-evident angle is really interesting — you'd probably want to layer a Merkle tree on top of the log entries. Happy to chat through the architecture if useful." },
      { sender: 'jake.morrison@decp.io', content: "That's exactly what I was thinking. Merkle proofs for log integrity would be a strong primitive. Do you think the system is stable enough to build on top of right now or is it still experimental?" },
      { sender: 'ryan.oconnor@decp.io', content: "Honest answer: single-node operations are solid, but the multi-node replication still has an edge case I'm debugging in leader election during network partition. I'd say another 2 weeks before I'd trust it for anything security-critical." },
      { sender: 'jake.morrison@decp.io', content: "Fair and honest — appreciated. I'll follow the repo and reach out in a couple weeks. Meanwhile, have you thought about joining the research project I'm running on vulnerability detection? Your systems background would be really valuable." },
      { sender: 'ryan.oconnor@decp.io', content: "I actually already joined! Saw the listing in the Research section. The combination of LLMs and C/C++ analysis is fascinating to me — static analysis is notoriously hard and if LLMs can genuinely help there it's a big deal." },
    ]
  },
];

async function main() {
  console.log('\n💬 Phase 3: Seeding conversations\n');

  // Get unique emails needed
  const emails = new Set();
  for (const c of CONVERSATIONS) {
    emails.add(c.from); emails.add(c.to);
  }

  // Login all with fresh tokens
  const tokens = {}, userIds = {};
  console.log('🔑 Getting fresh tokens...');
  for (const email of emails) {
    try {
      await sleep(200);
      const d = await login(email);
      tokens[email] = d.accessToken;
      userIds[email] = d.userId;
      console.log(`  ✅ ${email.split('@')[0]}`);
    } catch(e) { console.log(`  ⚠️  ${email}: ${e.message}`); }
  }

  console.log('\n📨 Sending messages...');
  for (const conv of CONVERSATIONS) {
    console.log(`\n  💬 ${conv.from.split('@')[0]} ↔ ${conv.to.split('@')[0]}`);
    for (const msg of conv.messages) {
      const senderToken = tokens[msg.sender];
      const recipientEmail = msg.sender === conv.from ? conv.to : conv.from;
      const recipientId = userIds[recipientEmail];
      if (!senderToken || !recipientId) {
        console.log(`    ⚠️  Missing token/id for ${msg.sender}`);
        continue;
      }
      const r = await api(senderToken).post('/api/v1/messages/send', { recipientId, content: msg.content });
      if (r.data.success) {
        process.stdout.write(`    ✓ `);
        console.log(`${msg.sender.split('@')[0]}: "${msg.content.slice(0, 55)}..."`);
      } else {
        console.log(`    ⚠️  FAILED (${msg.sender}): HTTP ${r.status} — ${JSON.stringify(r.data)}`);
      }
      await sleep(250);
    }
  }

  console.log('\n✅ Messages seeded!\n');

  // Verify
  console.log('📊 Verification:');
  const d = await login('liam.foster@decp.io');
  const inbox = await api(d.accessToken).get('/api/v1/messages/inbox');
  console.log(`  Liam inbox conversations: ${inbox.data.data?.length ?? 0}`);
  const d2 = await login('priya.sharma@decp.io');
  const inbox2 = await api(d2.accessToken).get('/api/v1/messages/inbox');
  console.log(`  Priya inbox conversations: ${inbox2.data.data?.length ?? 0}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
