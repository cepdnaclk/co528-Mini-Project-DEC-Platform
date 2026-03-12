/**
 * Populate feed with 3 local images, each posted by a different user,
 * with thematic content + comments from other users.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8082';
const PASS = 'Pass1234';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const api = token => axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${token}` },
  validateStatus: () => true,
});

async function login(email) {
  const r = await axios.post(`${BASE}/api/v1/auth/login`, { email, password: PASS }, { validateStatus: () => true });
  if (!r.data.success) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.data)}`);
  return r.data.data; // { accessToken, userId, ... }
}

async function uploadImage(token, filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  const r = await api(token).post('/api/v1/feed/media/upload-proxy', buf, {
    headers: { 'Content-Type': mime },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  if (!r.data.success) throw new Error(`Upload failed: ${JSON.stringify(r.data)}`);
  return r.data.publicUrl;
}

async function createPost(token, content, mediaUrls) {
  const r = await api(token).post('/api/v1/feed/posts', { content, mediaUrls });
  if (!r.data.success) throw new Error(`Post failed: ${JSON.stringify(r.data)}`);
  return r.data.data._id;
}

async function addComment(token, postId, content) {
  const r = await api(token).post(`/api/v1/feed/posts/${postId}/comments`, { content });
  if (!r.data.success) throw new Error(`Comment failed: ${JSON.stringify(r.data)}`);
  return r.data.data;
}

const IMAGES = {
  ai_lab:     path.resolve(__dirname, '../local-assets/Gemini_Generated_Image_5rpwgq5rpwgq5rpw.png'),
  kubernetes: path.resolve(__dirname, '../local-assets/Gemini_Generated_Image_rxjwitrxjwitrxjw.png'),
  alumni:     path.resolve(__dirname, '../local-assets/Gemini_Generated_Image_uon8qyuon8qyuon8.png'),
};

// Posts: [poster, content, imageKey]
const POSTS = [
  {
    poster: 'aisha.patel@decp.io',
    image: 'ai_lab',
    content: `Just wrapped up the first week of our new Quantum Computing & AI research lab at DEC — and I can't overstate how exciting this is. 🔬✨

We have students working on:
• Variational Quantum Eigensolvers for molecular simulation
• Hybrid quantum-classical neural architectures
• Causal representation learning with quantum gates

The hardware is in. The team is brilliant. The questions are hard.

If you're a student interested in quantum ML, this is your sign to reach out. We have two open research spots for next semester. Strong math background required; quantum experience not necessary — we'll teach you.

#QuantumComputing #AIResearch #MachineLearning #DEC #Research`,
  },
  {
    poster: 'ryan.oconnor@decp.io',
    image: 'kubernetes',
    content: `Deep-dive post: How Kubernetes actually works under the hood 🚢

I spent this weekend drawing out the control plane architecture for my dissertation. Here's what most tutorials get wrong:

❌ "The scheduler picks a node" — oversimplified
✅ The scheduler runs a filter + scoring pipeline across ALL eligible nodes, respecting taints, tolerations, resource requests, and affinity rules.

The magic of self-healing:
→ The Controller Manager runs reconciliation loops
→ It continuously compares desired state (etcd) vs actual state (kubelet reports)
→ Any drift triggers corrective action automatically

The part that blew my mind: etcd is the ONLY source of truth. Every component is stateless except etcd. Take it down and the whole cluster becomes read-only.

Building a distributed KV store for my dissertation gave me a completely new appreciation for this design. Would love to discuss with anyone else going deep on distributed systems!

#Kubernetes #DistributedSystems #CloudNative #DevOps #SoftwareEngineering`,
  },
  {
    poster: 'sarah.chen@decp.io',
    image: 'alumni',
    content: `Reflecting on DEC Alumni Day 2026 — and it genuinely moved me. 🎓

Moments like these remind me why I stay involved with this community:

📸 Top-left: Our department head receiving the Alumni Achievement Award — first time a DEC woman has won it in 15 years. Long overdue.

📸 Top-right: Students in deep collaboration mode. I remember being in that exact spot with my dissertation team. That laptop screen stress is universal.

📸 Bottom-left: Graduation. The moment everything clicks and you realise the degree is just the beginning.

📸 Bottom-right: A student presenting their research on fairness in credit-scoring algorithms to industry guests. The conversation they sparked was extraordinary.

To every DEC student reading this: you are already in a room that most people never get into. Use it.

And to the Class of 2026 — congratulations. Come find me at the next career fair. I owe you a coffee and an honest conversation about what Big Tech is actually like.

#DECAlumni #Graduation #WomenInTech #Mentorship #CareerAdvice`,
  },
];

// Comments per post: [commenter_email, content]
const COMMENTS = {
  ai_lab: [
    ['ethan.kim@decp.io',      'Dr. Patel, this is incredible — our lab has a Kubernetes operator for ML training jobs, would love to explore running quantum workloads on it. Would you be open to a collaboration chat?'],
    ['priya.sharma@decp.io',   'I submitted my application for one of those spots! My causal inference work from last semester feels directly relevant — fingers crossed 🤞'],
    ['liam.foster@decp.io',    'The combination of causal methods and quantum gates is something I had never even considered. This changes how I think about my ML coursework entirely.'],
    ['jake.morrison@decp.io',  'From a security angle: quantum computing breaking RSA is the obvious concern, but the real challenge is building post-quantum cryptography that survives the transition period. Is any of your work touching on that?'],
    ['maya.patel@decp.io',     'My PhD is on fairness in algorithmic decision-making — quantum ML adds a fascinating new axis to this. If quantum models are less interpretable, how do we audit them? Genuinely don\'t have an answer yet.'],
  ],
  kubernetes: [
    ['ethan.kim@decp.io',      'This is literally what my dissertation is on. The etcd single source of truth design is elegant but it also means etcd performance is your cluster performance ceiling. My operator deals with this constantly.'],
    ['jake.morrison@decp.io',  'The distributed systems parallels with your KV store project are fascinating. Have you looked at how Raft consensus in etcd compares to your leader election implementation? The failure mode handling is where it gets interesting.'],
    ['omar.hassan@decp.io',    'As someone coming from a PM background: this post is exactly why I need engineering friends. The "desired state vs actual state" mental model is actually a great product analogy too — roadmap vs reality reconciliation loop 😄'],
    ['liam.foster@decp.io',    'I\'ve been meaning to go deeper on k8s for months. The way you explained the filter+scoring pipeline for the scheduler finally made it click. Bookmarking this thread.'],
    ['anika.gupta@decp.io',    'Ryan, would you be up for presenting this at the research symposium? The visualisation alone would make a great 10-minute lightning talk. I\'m helping organise the schedule.'],
  ],
  alumni: [
    ['liam.foster@decp.io',    'This hit hard, especially the graduation photo. Three months away and I\'m a mix of terrified and excited. Thank you for always being honest about what comes after.'],
    ['priya.sharma@decp.io',   'The student in that bottom-right photo presenting fairness research — that\'s the kind of work that actually matters. It\'s encouraging to see it getting serious attention from industry guests.'],
    ['omar.hassan@decp.io',    'Sarah this is beautiful. The Alumni Achievement Award moment is particularly special — representation matters so much for students deciding whether this field is for them.'],
    ['ethan.kim@decp.io',      'Already have my post-graduation coffee meeting request drafted 😄 Seriously though, your advice about writing clearly being the most important engineering skill has changed how I approach everything I produce.'],
    ['chloe.zhang@decp.io',    'That student collaboration photo brings back so many memories. The number of all-nighters in the exact same position... worth every one of them. Congrats to the Class of 2026!'],
  ],
};

async function main() {
  console.log('\n🖼️  Populating feed with local images\n');

  // Login all needed users
  const emails = new Set([...POSTS.map(p => p.poster)]);
  Object.values(COMMENTS).forEach(arr => arr.forEach(([e]) => emails.add(e)));

  const tokens = {}, userIds = {};
  console.log('🔑 Logging in users...');
  for (const email of emails) {
    await sleep(200);
    const d = await login(email);
    tokens[email] = d.accessToken;
    userIds[email] = d.userId;
    console.log(`  ✅ ${email.split('@')[0]}`);
  }

  // Upload images & create posts
  const postIds = {};
  console.log('\n📸 Uploading images & creating posts...');
  for (const p of POSTS) {
    const token = tokens[p.poster];
    console.log(`\n  📤 Uploading ${p.image} as ${p.poster.split('@')[0]}...`);
    const publicUrl = await uploadImage(token, IMAGES[p.image]);
    console.log(`     ✅ Uploaded → ${publicUrl.slice(0, 60)}...`);

    const postId = await createPost(token, p.content, [publicUrl]);
    postIds[p.image] = postId;
    console.log(`     ✅ Post created: ${postId}`);
    await sleep(500);
  }

  // Add comments
  console.log('\n💬 Adding comments...');
  for (const [imageKey, commentList] of Object.entries(COMMENTS)) {
    const postId = postIds[imageKey];
    console.log(`\n  Post: ${imageKey} (${postId})`);
    for (const [email, content] of commentList) {
      await sleep(300);
      await addComment(tokens[email], postId, content);
      console.log(`    ✅ ${email.split('@')[0]}: "${content.slice(0, 60)}..."`);
    }
  }

  console.log('\n✅ Done! 3 posts with images + 15 comments seeded.\n');
  console.log('Post IDs:');
  Object.entries(postIds).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
