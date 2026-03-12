/**
 * Phase 2: Jobs, Applications, Events, Research
 */
const axios = require('axios');

const BASE = 'http://localhost:8082';
const PASS = 'Pass1234';
const api = (token) => axios.create({ baseURL: BASE, headers: token ? { Authorization: `Bearer ${token}` } : {}, validateStatus: () => true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function login(email, password = PASS) {
  const r = await api().post('/api/v1/auth/login', { email, password });
  if (!r.data.success) throw new Error(`Login failed: ${email} — ${JSON.stringify(r.data)}`);
  return r.data.data;
}

const ALUMNI_EMAILS = ['sarah.chen@decp.io','marcus.t@decp.io','aisha.patel@decp.io','james.obrien@decp.io','elena.r@decp.io'];
const STUDENT_EMAILS = ['liam.foster@decp.io','priya.sharma@decp.io','omar.hassan@decp.io','sophie.w@decp.io','ethan.kim@decp.io','anika.gupta@decp.io','ryan.oconnor@decp.io','maya.patel@decp.io','jake.morrison@decp.io','chloe.zhang@decp.io'];

const JOBS = [
  { email: 'sarah.chen@decp.io', job: { title: 'Machine Learning Engineer Intern', company: 'Google DeepMind', location: 'London, UK (Hybrid)', type: 'internship', description: "Join Google's ML infrastructure team for a 12-week summer internship. You'll work on real production ML pipelines serving billions of requests per day. Projects include improving model serving latency, building evaluation frameworks, and contributing to our internal ML platform.\n\nPaid internship (competitive stipend + housing allowance). Paired with a senior engineer mentor and weekly tech talks from Google researchers.\n\nIdeal for penultimate or final year students with strong Python and ML fundamentals.", requirements: ['Python','TensorFlow or PyTorch','Strong CS fundamentals','Linear algebra & probability','Git'] } },
  { email: 'marcus.t@decp.io', job: { title: 'Product Management Intern', company: 'Stripe', location: 'London, UK (Hybrid)', type: 'internship', description: "Stripe is looking for a PM intern to join our Payments team. You'll own a meaningful product area for the summer, running user research, defining requirements, and working closely with engineering to ship improvements.\n\nStripe processes hundreds of billions in payments annually. Your decisions affect real businesses.\n\nLooking for analytical thinkers who balance user empathy with business rigour.", requirements: ['Analytical thinking','Clear written communication','SQL or data analysis experience','User research interest','Previous PM experience a plus'] } },
  { email: 'aisha.patel@decp.io', job: { title: 'AI Research Intern', company: 'DeepMind', location: 'London, UK (On-site)', type: 'internship', description: "DeepMind is seeking exceptional research interns. Interns are treated as full research scientists — you'll contribute to projects with real scientific impact, potentially leading to co-authored publications.\n\nPrevious interns have contributed to papers at NeurIPS, ICML, and ICLR.\n\nHighly competitive position. Looking for students with strong mathematical foundations, prior research experience, and independent scientific thinking.", requirements: ['PhD student or exceptional final-year Masters','Strong linear algebra, probability & optimisation','Deep learning expertise (PyTorch preferred)','Prior publications or preprints a strong plus','Research problem-solving ability'] } },
  { email: 'james.obrien@decp.io', job: { title: 'Backend Engineer (Go)', company: 'NexaTech', location: 'London, UK (Hybrid)', type: 'full-time', description: "NexaTech is building the real-time data infrastructure layer for European fintech. Just closed our Series A. Looking for a backend engineer to join our core platform team.\n\nYou'll work on our distributed event streaming system, designing APIs consumed by major fintech clients, and helping architect our next-generation data plane.\n\nEarly hire = huge scope + equity. We genuinely want to hire from DEC. Competitive salary, equity, and real engineering culture.", requirements: ['Go (or strong desire to learn)','Distributed systems understanding','PostgreSQL or similar','Event-driven architectures','Kubernetes basics a plus'] } },
  { email: 'elena.r@decp.io', job: { title: 'Data Scientist — Trust & Integrity', company: 'Meta', location: 'London, UK (Hybrid)', type: 'full-time', description: "Meta's Trust & Integrity team is looking for a data scientist to help keep the platform safe at scale. You'll use statistical modelling, ML, and large-scale data analysis to understand and mitigate harmful patterns.\n\nMeaningful work at the intersection of social science, ML, and policy.\n\nStrong analytical background required. Spark, SQL, and Python essential. Previous work in trust, safety, or fairness a significant plus.", requirements: ['Python (Pandas, Scikit-learn)','SQL at scale','Spark or similar big data tools','Statistical modelling','Excellent communication skills','Interest in fairness and integrity'] } },
];

const EVENTS = [
  { title: 'DEC Tech Career Fair 2026', description: "The biggest DEC career event of the year! 25+ companies attending including Google, Stripe, DeepMind, Palantir, Jane Street, Monzo, and many more. Bring your CV, dress smart, and come ready to talk to recruiters and engineers.\n\nStructured networking sessions, a panel on the current tech job market, and a CV review station staffed by alumni volunteers.\n\nFree to attend. Register early — spots limited.", eventDate: new Date(Date.now() + 14*24*60*60*1000).toISOString(), location: 'DEC Main Auditorium, Building A' },
  { title: 'Alumni Networking Night: AI & ML Edition', description: "An intimate evening for students interested in AI/ML to connect with alumni at the forefront of the field. Alumni confirmed: Dr. Aisha Patel (DeepMind), plus guests from Anthropic, Waymo, and Hugging Face.\n\nFormat: 10 min lightning talks, then open networking with drinks and food. Great opportunity for honest career conversations.\n\nLimited to 40 students — RSVP required.", eventDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(), location: 'DEC Innovation Hub, Room 204' },
  { title: 'Student Research Symposium 2026', description: "Present your research to peers, faculty, and industry guests. 18 student presentations across AI, Systems, Security, HCI, and Theory.\n\nBest paper award: £500 + guaranteed publication in the DEC Research Journal. All presentations recorded and posted to DEC YouTube.\n\nOpen to all. Presenting students must register abstract by 1 week before.", eventDate: new Date(Date.now() + 21*24*60*60*1000).toISOString(), location: 'DEC Conference Centre, Hall B' },
];

const RESEARCH = [
  { email: 'aisha.patel@decp.io', project: { title: 'Causal Representation Learning for NLP', description: "Building methods to improve NLP model robustness by incorporating causal structure into representation learning. Goal: models that generalise across domains without retraining.\n\nLooking for students with strong ML backgrounds and ideally exposure to causal inference. Weekly meetings, 10-15 hrs/week commitment.", domain: 'Machine Learning', tags: ['NLP','Causal Inference','Deep Learning','Research'] } },
  { email: 'james.obrien@decp.io', project: { title: 'Open Source Distributed Key-Value Store', description: "Building a production-quality distributed KV store in Go as a reference implementation of the Raft consensus protocol.\n\nContributors learn: Raft consensus, leader election, log replication, snapshotting, linearisable reads, and gRPC API design.\n\nAll levels welcome — from newcomers to distributed systems to those who've read the papers.", domain: 'Distributed Systems', tags: ['Go','Raft','Databases','Open Source'] } },
  { email: 'jake.morrison@decp.io', project: { title: 'Automated Vulnerability Detection with LLMs', description: "Exploring whether LLMs can reliably detect security vulnerabilities in C/C++ code and suggest correct patches. Building a benchmark dataset and evaluation framework.\n\nLooking for students with security or ML background (ideally both, one is fine).\n\nTarget: paper submission to IEEE S&P or USENIX Security.", domain: 'Cybersecurity', tags: ['Security','LLMs','Vulnerability Detection','Research'] } },
];

const COVER_LETTERS = {
  'Machine Learning Engineer Intern': [
    { email: 'priya.sharma@decp.io', cl: "I am writing to apply for the ML Engineer Intern role at Google DeepMind. My MSc in AI has given me deep expertise in NLP and multimodal learning, with a focus on cross-lingual transfer — directly relevant to your ML infrastructure work. I recently had a workshop paper accepted at EMNLP 2026 and am comfortable with large-scale PyTorch training pipelines. I would bring genuine research rigour and a willingness to do the hard engineering work that makes ML systems production-ready.", cv: "https://cv.example.com/priya-sharma" },
    { email: 'maya.patel@decp.io', cl: "As a first-year PhD student in causal ML, I am excited to bring a research perspective to ML engineering at Google. My background in statistical modelling, fairness methods, and PyTorch, combined with TA experience communicating complex concepts, makes me well-suited to both the technical and collaborative aspects of this role.", cv: "https://cv.example.com/maya-patel" },
    { email: 'ethan.kim@decp.io', cl: "While my primary focus has been infrastructure and DevOps, I have been expanding into ML engineering through my dissertation on Kubernetes operators for distributed ML training. This role excites me because it sits at exactly this intersection — I understand the infrastructure constraints that ML teams face and can work effectively across the stack.", cv: "https://cv.example.com/ethan-kim" },
  ],
  'Product Management Intern': [
    { email: 'chloe.zhang@decp.io', cl: "I spent the past year as PM of DEC's Entrepreneurship Society, defining our product roadmap, running user research, and coordinating a team of 15. Stripe's developer focus is particularly exciting — my engineering background means I can read code, understand technical constraints, and earn engineering trust quickly.", cv: "https://cv.example.com/chloe-zhang" },
    { email: 'omar.hassan@decp.io', cl: "I am an engineer who wants to build better products, not just features. My experience as a freelance developer has taught me how to rapidly understand user needs and translate them into technical requirements. I have shipped five products to real users. I am particularly excited about Stripe's Developer Experience team — I know the pain of poor API documentation firsthand.", cv: "https://cv.example.com/omar-hassan" },
    { email: 'sophie.w@decp.io', cl: "My mathematical rigour and communication skills make me effective at the data-to-decision pipeline PM work requires. I have worked as a freelance data analyst and presented insights to C-suite stakeholders — I know how to make numbers tell a story. Stripe's metrics-first culture is exactly what I want to work in.", cv: "https://cv.example.com/sophie-williams" },
  ],
  'AI Research Intern': [
    { email: 'priya.sharma@decp.io', cl: "I am first author on a peer-reviewed workshop paper at EMNLP 2026 and am currently exploring causal representation learning for NLP robustness. Dr. Aisha Patel has been a mentor throughout my MSc and I am familiar with DeepMind's research culture from her guidance. I am prepared for the rigour and independence a research internship at DeepMind demands.", cv: "https://cv.example.com/priya-sharma" },
    { email: 'maya.patel@decp.io', cl: "As a PhD student working on causal fairness in ML systems, I have the independent research skills and theoretical foundations to contribute immediately to DeepMind's research agenda. I am comfortable with ambiguity and driven by scientific curiosity.", cv: "https://cv.example.com/maya-patel" },
  ],
  'Backend Engineer (Go)': [
    { email: 'ethan.kim@decp.io', cl: "I have been building a production-quality Kubernetes operator in Go for my dissertation — a stateful workload manager for distributed ML training. This has given me deep experience with Go's concurrency model, the Kubernetes API, and distributed systems patterns. James has seen the code and I hope it speaks for itself.", cv: "https://cv.example.com/ethan-kim" },
    { email: 'ryan.oconnor@decp.io', cl: "My dissertation is a distributed key-value store implementing the Raft consensus protocol in Go. I have implemented leader election, log replication, snapshotting, and linearisable reads from scratch. NexaTech's event streaming challenges excite me enormously.", cv: "https://cv.example.com/ryan-oconnor" },
    { email: 'liam.foster@decp.io', cl: "I am a full-stack engineer with strong backend instincts. While my primary languages are TypeScript and Node.js, I have been learning Go for six months and am comfortable with its idioms. I would bring strong fundamentals, the ability to learn fast, and genuine excitement about working at an early-stage company where scope is large.", cv: "https://cv.example.com/liam-foster" },
  ],
  'Data Scientist — Trust & Integrity': [
    { email: 'sophie.w@decp.io', cl: "My MSc in Data Science and mathematical modelling background prepare me well for the statistical rigour Meta's Trust team requires. I have experience with causal methods and A/B testing, and I care deeply about making algorithmic systems fair and safe. The Trust & Integrity mission resonates with me personally.", cv: "https://cv.example.com/sophie-williams" },
    { email: 'maya.patel@decp.io', cl: "My PhD research on causal fairness in automated decision systems is directly relevant to Meta's Trust & Integrity work. I bring expertise in causal inference, statistical modelling, and Python/Spark, combined with deep thinking about the ethical dimensions of algorithmic systems.", cv: "https://cv.example.com/maya-patel" },
    { email: 'priya.sharma@decp.io', cl: "The intersection of ML and integrity is something I think about a lot — my NLP research touches on bias in language models. I bring strong Python, solid SQL, and the analytical mindset to work with very large datasets.", cv: "https://cv.example.com/priya-sharma" },
  ],
};

async function main() {
  console.log('\n🔄 Phase 2: Jobs, Events, Research\n');
  const tokens = {}, userIds = {};

  // Login all users
  console.log('🔑 Logging in all users...');
  const allEmails = [...ALUMNI_EMAILS, ...STUDENT_EMAILS];
  for (const email of allEmails) {
    try {
      const d = await login(email);
      tokens[email] = d.accessToken;
      userIds[email] = d.userId;
      await sleep(100);
    } catch(e) { console.log(`  ⚠️  ${email}: ${e.message}`); }
  }
  // Admin
  try {
    const d = await login('admin@decp.io', 'Admin1234');
    tokens['admin@decp.io'] = d.accessToken;
    userIds['admin@decp.io'] = d.userId;
  } catch(e) { console.log('  ⚠️  admin:', e.message); }

  console.log(`  ✅ Logged in ${Object.keys(tokens).length} users\n`);

  // Jobs
  console.log('💼 Creating jobs...');
  const jobIds = [];
  for (const j of JOBS) {
    await sleep(300);
    if (!tokens[j.email]) { console.log(`  ⚠️  No token for ${j.email}`); continue; }
    const r = await api(tokens[j.email]).post('/api/v1/jobs', j.job);
    if (r.data.success) {
      jobIds.push({ id: r.data.data._id, poster: j.email, title: j.job.title });
      console.log(`  ✅ "${j.job.title}" at ${j.job.company}`);
    } else {
      console.log(`  ⚠️  Job failed (${j.email}):`, r.data.error || r.data);
    }
  }

  // Applications
  console.log('\n📨 Processing applications...');
  for (const job of jobIds) {
    const applicants = COVER_LETTERS[job.title] || [];
    for (const app of applicants) {
      await sleep(200);
      if (!tokens[app.email]) continue;
      const r = await api(tokens[app.email]).post(`/api/v1/jobs/${job.id}/apply`, { coverLetter: app.cl, cvUrl: app.cv });
      if (r.data.success) console.log(`  ✅ ${app.email.split('@')[0]} → ${job.title}`);
      else console.log(`  ⚠️  Apply failed (${app.email}):`, r.data.error);
    }
  }

  // Update application statuses
  console.log('\n📋 Updating application statuses...');
  for (const job of jobIds) {
    await sleep(200);
    const appsR = await api(tokens[job.poster]).get(`/api/v1/jobs/${job.id}/applications`);
    if (!appsR.data.success || !appsR.data.data.length) continue;
    const apps = appsR.data.data;
    if (apps[0]) { await api(tokens[job.poster]).put(`/api/v1/jobs/${job.id}/applications/${apps[0]._id}`, { status: 'accepted' }); await sleep(150); }
    if (apps[1]) { await api(tokens[job.poster]).put(`/api/v1/jobs/${job.id}/applications/${apps[1]._id}`, { status: 'rejected' }); await sleep(150); }
    console.log(`  ✅ Statuses updated for: ${job.title}`);
  }

  // Events
  console.log('\n📅 Creating events...');
  const eventIds = [];
  for (const ev of EVENTS) {
    await sleep(400);
    if (!tokens['admin@decp.io']) { console.log('  ⚠️  No admin token'); break; }
    const r = await api(tokens['admin@decp.io']).post('/api/v1/events', ev);
    if (r.data.success) {
      eventIds.push(r.data.data._id);
      console.log(`  ✅ "${ev.title}"`);
    } else console.log(`  ⚠️  Event failed:`, r.data.error || r.data);
  }

  // RSVPs
  console.log('\n🎟️  Adding RSVPs...');
  const rsvpUsers = [...ALUMNI_EMAILS, ...STUDENT_EMAILS];
  let rsvpCount = 0;
  for (const evId of eventIds) {
    for (const u of rsvpUsers) {
      if (!tokens[u] || Math.random() > 0.65) continue;
      await api(tokens[u]).post(`/api/v1/events/${evId}/rsvp`);
      rsvpCount++; await sleep(80);
    }
  }
  console.log(`  ✅ ${rsvpCount} RSVPs added`);

  // Research projects
  console.log('\n🔬 Creating research projects...');
  const projectIds = [];
  for (const rp of RESEARCH) {
    await sleep(400);
    if (!tokens[rp.email]) continue;
    const r = await api(tokens[rp.email]).post('/api/v1/research', rp.project);
    if (r.data.success) {
      projectIds.push(r.data.data._id);
      console.log(`  ✅ "${rp.project.title}"`);
    } else console.log(`  ⚠️  Research failed:`, r.data.error || r.data);
  }

  // Students join projects
  console.log('\n👥 Students joining research projects...');
  const joinPairs = [
    { student: 'priya.sharma@decp.io', idx: 0 },
    { student: 'maya.patel@decp.io',   idx: 0 },
    { student: 'ryan.oconnor@decp.io', idx: 1 },
    { student: 'ethan.kim@decp.io',    idx: 1 },
    { student: 'liam.foster@decp.io',  idx: 1 },
    { student: 'jake.morrison@decp.io',idx: 2 },
    { student: 'ryan.oconnor@decp.io', idx: 2 },
  ];
  for (const jp of joinPairs) {
    const pid = projectIds[jp.idx];
    if (!pid || !tokens[jp.student]) continue;
    const r = await api(tokens[jp.student]).post(`/api/v1/research/${pid}/join`);
    if (r.data.success) console.log(`  ✅ ${jp.student.split('@')[0]} joined project ${jp.idx}`);
    await sleep(150);
  }

  console.log('\n✨ Phase 2 complete!\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
