/**
 * DEC Platform — Full Database Population Script
 * Run: node scripts/populate.js
 */
const axios = require('axios');

const BASE = 'http://localhost:8082';
const PASS = 'Pass1234';

// ─── Helpers ────────────────────────────────────────────────────────────────
const api = (token) => axios.create({
  baseURL: BASE,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  validateStatus: () => true,
});

async function register(name, email, role) {
  const r = await api().post('/api/v1/auth/register', { name, email, password: PASS, role });
  if (!r.data.success) {
    // might already exist — try login
    const l = await api().post('/api/v1/auth/login', { email, password: PASS });
    if (!l.data.success) throw new Error(`Cannot register/login ${email}: ${JSON.stringify(l.data)}`);
    return l.data.data;
  }
  return r.data.data;
}

async function login(email) {
  const r = await api().post('/api/v1/auth/login', { email, password: PASS });
  if (!r.data.success) throw new Error(`Login failed for ${email}`);
  return r.data.data; // { userId, accessToken, refreshToken }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── User Definitions ────────────────────────────────────────────────────────
const ALUMNI = [
  {
    name: 'Sarah Chen',          email: 'sarah.chen@decp.io',
    bio: 'Senior Software Engineer at Google with 8 years in distributed systems and ML infrastructure. Passionate about mentoring the next generation of engineers. Love to talk about system design, career growth, and making technology more inclusive.',
    skills: ['Python', 'Kubernetes', 'Machine Learning', 'System Design', 'Go', 'TensorFlow'],
  },
  {
    name: 'Marcus Thompson',     email: 'marcus.t@decp.io',
    bio: 'Product Manager at Stripe. Previously founded two startups in fintech. I help students bridge the gap between technical skills and product thinking. Always happy to do mock interviews and CV reviews.',
    skills: ['Product Strategy', 'Agile', 'Analytics', 'SQL', 'Roadmapping', 'User Research'],
  },
  {
    name: 'Dr. Aisha Patel',     email: 'aisha.patel@decp.io',
    bio: 'ML Research Lead at DeepMind. PhD in Computer Vision from Cambridge. Published 20+ papers on deep learning and reinforcement learning. Open to supervising research collaborations with motivated students.',
    skills: ['Deep Learning', 'NLP', 'Computer Vision', 'PyTorch', 'Research', 'Reinforcement Learning'],
  },
  {
    name: "James O'Brien",       email: 'james.obrien@decp.io',
    bio: 'CTO at NexaTech. DEC alumni class of 2016. Built engineering teams from 0 to 80 people. Expert in backend architecture, cloud-native systems, and startup scaling. Office hours every Thursday — book a slot!',
    skills: ['Go', 'AWS', 'Distributed Systems', 'Leadership', 'Architecture', 'Kafka'],
  },
  {
    name: 'Elena Rodriguez',     email: 'elena.r@decp.io',
    bio: 'Data Science Lead at Meta, working on integrity and trust signals. Former Goldman Sachs quant. I mentor students in data science, ML interviews, and transitioning from academia to industry.',
    skills: ['Data Science', 'Python', 'SQL', 'Spark', 'Statistical Modelling', 'A/B Testing'],
  },
];

const STUDENTS = [
  {
    name: 'Liam Foster',         email: 'liam.foster@decp.io',
    bio: 'Final year Computer Science student specialising in full-stack web development. Built several open source projects. Currently seeking summer internship opportunities in software engineering.',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
  },
  {
    name: 'Priya Sharma',        email: 'priya.sharma@decp.io',
    bio: 'Second year MSc student in Artificial Intelligence. Deeply passionate about NLP and multimodal learning. Published a workshop paper at NeurIPS 2025. Looking for PhD opportunities or research internships.',
    skills: ['Python', 'PyTorch', 'NLP', 'Transformers', 'Hugging Face', 'Research'],
  },
  {
    name: 'Omar Hassan',         email: 'omar.hassan@decp.io',
    bio: 'Third year Software Engineering student and freelance developer. Built apps used by 5000+ users. Love hackathons — won three this year! Strong in full-stack and mobile development.',
    skills: ['React Native', 'Node.js', 'MongoDB', 'GraphQL', 'Firebase', 'Tailwind CSS'],
  },
  {
    name: 'Sophie Williams',     email: 'sophie.w@decp.io',
    bio: 'Data Science MSc student with a background in Mathematics. Obsessed with visualisations and storytelling with data. Interned at Deloitte Analytics last summer. Active in the DEC Women in Tech society.',
    skills: ['Python', 'R', 'Tableau', 'Pandas', 'Machine Learning', 'Data Visualisation'],
  },
  {
    name: 'Ethan Kim',           email: 'ethan.kim@decp.io',
    bio: 'Final year student focused on DevOps and cloud infrastructure. AWS Certified Solutions Architect. Currently building a Kubernetes operator for my dissertation. Loves automation and CI/CD pipelines.',
    skills: ['Kubernetes', 'AWS', 'Terraform', 'Jenkins', 'Python', 'Linux'],
  },
  {
    name: 'Anika Gupta',         email: 'anika.gupta@decp.io',
    bio: 'Frontend developer and UI/UX designer in my final year. Passionate about accessibility and inclusive design. Freelanced for NGOs building digital platforms. Portfolio includes 12 live projects.',
    skills: ['React', 'Figma', 'CSS', 'Accessibility', 'TypeScript', 'Design Systems'],
  },
  {
    name: "Ryan O'Connor",       email: 'ryan.oconnor@decp.io',
    bio: 'Backend engineer at heart. Final year student working with distributed databases and high-performance systems for my dissertation. Contributed to several open source Go projects.',
    skills: ['Go', 'PostgreSQL', 'Redis', 'gRPC', 'System Design', 'Docker'],
  },
  {
    name: 'Maya Patel',          email: 'maya.patel@decp.io',
    bio: 'First year PhD student in Machine Learning. Research focus on causal inference and fairness in AI. Part-time TA for the ML course. Looking to connect with researchers and industry practitioners.',
    skills: ['Python', 'Causal ML', 'Statistics', 'R', 'PyTorch', 'Research Methods'],
  },
  {
    name: 'Jake Morrison',       email: 'jake.morrison@decp.io',
    bio: 'Cybersecurity student and CTF enthusiast. Ranked top 50 globally on HackTheBox. Interested in penetration testing, reverse engineering, and secure systems design. Looking for security-focused grad roles.',
    skills: ['Penetration Testing', 'Python', 'Linux', 'Network Security', 'Cryptography', 'CTF'],
  },
  {
    name: 'Chloe Zhang',         email: 'chloe.zhang@decp.io',
    bio: 'Product-minded engineer in my penultimate year. Love building things people actually want to use. Currently PM of the DEC Entrepreneurship Society. Interned at two early-stage startups. Seeking PM or strategy roles.',
    skills: ['Product Management', 'Figma', 'SQL', 'User Research', 'Growth', 'Notion'],
  },
];

// ─── Feed Post Content ───────────────────────────────────────────────────────
function getAlumniPosts(names) {
  return [
    // Sarah Chen
    { email: 'sarah.chen@decp.io', content: `🚀 Just wrapped up our Q1 engineering all-hands at Google and I'm reminded of something I wish I knew as a student: the best engineers are great communicators first, coders second.\n\nIn your career you will spend roughly 40% of your time writing code and 60% explaining decisions, reviewing PRs, writing design docs, and aligning stakeholders. Practice writing clearly now. Your future teammates will thank you.\n\nHappy to review any of your technical writing if you want feedback! Drop me a message.` },
    { email: 'sarah.chen@decp.io', content: `System design tip for students preparing for interviews:\n\nWhen you are asked "design Twitter" or "design a URL shortener", start with these four questions:\n\n1️⃣ What is the scale? (DAU, QPS, storage)\n2️⃣ What are the read/write patterns?\n3️⃣ What consistency tradeoffs are acceptable?\n4️⃣ Where does latency matter most?\n\nMost candidates dive straight into drawing boxes. The ones who ask questions first always get the offer. #SoftwareEngineering #SystemDesign` },

    // Marcus Thompson
    { email: 'marcus.t@decp.io', content: `Real talk on PM interviews: behavioural questions trip people up more than case studies.\n\n"Tell me about a time you failed" is not an invitation to minimise or dodge. Interviewers want:\n• A real, significant failure\n• Clear ownership (no blame-shifting)\n• Specific actions you took\n• What you learned and changed\n\nI've interviewed 200+ PM candidates at Stripe and the ones who answer this authentically almost always move forward. Vulnerability signals self-awareness.\n\n#ProductManagement #CareerAdvice #PMInterview` },
    { email: 'marcus.t@decp.io', content: `Excited to announce we're opening summer internship applications at Stripe! Two Product Management intern roles on our Payments and Developer Experience teams.\n\nIf you're passionate about financial infrastructure and developer tools, these are fantastic opportunities to work on products used by millions of businesses worldwide.\n\nCheck the jobs board — deadline is rolling so apply early. Happy to give feedback on your application before you submit. Just message me directly.` },

    // Dr. Aisha Patel
    { email: 'aisha.patel@decp.io', content: `A question I get asked all the time: "Do I need a PhD to work in AI research?"\n\nHonest answer: it depends what you want to do.\n\nIf you want to publish, advance the state of the art, or lead research teams at places like DeepMind, Google Brain, or OpenAI — yes, a PhD is almost always required.\n\nIf you want to apply ML to real products and solve practical problems — industry is full of brilliant engineers doing just that without a PhD.\n\nBoth paths are valid. Neither is better. Know what you're optimising for.\n\n#MachineLearning #ArtificialIntelligence #PhDLife #CareerAdvice` },
    { email: 'aisha.patel@decp.io', content: `Thrilled that our paper on cross-lingual transfer learning was accepted to ICML 2026! 🎉\n\nThis is work I started with two brilliant DEC students during a research collaboration last year. It's a great reminder that impactful research can start anywhere — you don't need to be at a top institution to contribute to the field.\n\nFor students interested in ML research: reach out! I'm actively looking for collaborators on our next project on causal representation learning. Prior experience with PyTorch and a solid stats background preferred.` },

    // James O'Brien
    { email: 'james.obrien@decp.io', content: `Hot take: most CS curricula are teaching students the wrong things.\n\nYou spend four years learning algorithms and theory (important!) but almost no time on:\n\n• Reading and understanding large codebases\n• Code review practices\n• Debugging in production\n• Incident response\n• Writing runbooks and postmortems\n• Working in a team under deadline pressure\n\nThese are the skills that determine your first-year performance at any company. Use side projects and open source contributions to practise them now.\n\n#CSTips #SoftwareEngineering #TechCareers` },
    { email: 'james.obrien@decp.io', content: `We just closed our Series A at NexaTech! 🎊 £8M to build the future of real-time infrastructure for European fintech.\n\nThis means we're hiring! Looking for backend engineers (Go), platform engineers (Kubernetes/AWS), and a junior DevOps engineer.\n\nI started NexaTech as a DEC student project, so I'll always prioritise DEC applicants. If you're a final year student or recent grad — please apply. We move fast, the work is real, and equity is on the table.\n\nJobs are posted on the board. DMs open.` },

    // Elena Rodriguez
    { email: 'elena.r@decp.io', content: `The biggest mistake I see data science students make in their portfolios:\n\nBuilding models that don't connect to business outcomes.\n\nA portfolio that says "I built a model with 94% accuracy on Kaggle" is much weaker than:\n\n"I built a churn prediction model. At a threshold of 0.6, it identifies 78% of churning customers 30 days before churn. At £20 average intervention cost and £200 LTV, this model is worth approximately £X per month."\n\nAlways think: so what? Who cares? How much is it worth?\n\n#DataScience #MachineLearning #CareerAdvice` },
    { email: 'elena.r@decp.io', content: `Just finished my monthly mentoring sessions and was blown away by the calibre of DEC students this year. Truly impressive work on everything from recommendation systems to fairness in credit scoring.\n\nReminder that I do CV and portfolio reviews every last Friday of the month — check the events board for booking slots. No cost, just bring your best work and your honest questions.\n\nData roles at Meta are highly competitive but absolutely achievable from this programme. Let's get you there. 💪` },

    // Students
    { email: 'liam.foster@decp.io', content: `Just shipped v2 of my open source project: a self-hosted analytics dashboard built with Next.js, ClickHouse, and Tailwind. Completely cookie-free and GDPR compliant.\n\n✅ Real-time event tracking\n✅ Custom funnel analysis\n✅ 100% open source\n\nThis has been my main side project for six months and I'm really proud of how it turned out. Would love feedback from anyone who tries it!\n\n#OpenSource #NextJS #Analytics #WebDev` },
    { email: 'priya.sharma@decp.io', content: `Paper accepted! 🎉 My first solo-author workshop paper "Multilingual Coreference Resolution using Cross-Attention Bridges" will appear at the EMNLP 2026 Multilingual Workshop.\n\nThis started as a coursework project that I stayed up way too many nights extending. Huge thanks to Dr. Aisha Patel for feedback on early drafts.\n\nFor students considering research: just start. Write the thing. Submit it. Rejection teaches you, and acceptance is possible earlier than you think.\n\n#NLP #Research #MachineLearning #EMNLP` },
    { email: 'omar.hassan@decp.io', content: `Won first place at the Oxford Hack 2026 this weekend! 🏆\n\nOur team of four built a real-time sign language translation app using MediaPipe and a custom transformer model, integrated with video calls. 36 hours, zero sleep, an awful lot of Red Bull.\n\nSo grateful for the team — Sophie, Ryan, and Anika you were incredible. Special shout out to the DeepMind sponsor table for the midnight pep talk.\n\nThe code is on GitHub if anyone wants to explore it. We're thinking of taking it further! #Hackathon #ML #SignLanguage` },
    { email: 'sophie.w@decp.io', content: `Visualisation of the week: I mapped ten years of DEC graduate employment data and the results are honestly quite striking.\n\nKey findings:\n📊 Median first-year salary has risen 34% in five years\n📊 42% of DEC grads join startups first (vs 28% in 2020)\n📊 The biggest growth sectors for our grads: fintech, AI/ML, and climate tech\n\nFull interactive dashboard in the link. Made entirely in Observable and D3.js. Data sourced from the public alumni survey.\n\n#DataViz #DECAlumni #CareerStats` },
    { email: 'ethan.kim@decp.io', content: `Just passed my AWS Solutions Architect Professional exam! ☁️\n\nStudied for three months alongside my dissertation. Here's what actually worked for me:\n\n1. AWS official practice exams (do all of them, multiple times)\n2. Stephane Maarek's Udemy course (worth every penny)\n3. Actually building the architectures in a free-tier account\n4. A Notion doc where I wrote explanations in plain English after each service\n\nHappy to share my notes if anyone is studying for this. Just DM me.\n\n#AWS #CloudComputing #DevOps #Certification` },
    { email: 'anika.gupta@decp.io', content: `Accessibility is not a feature — it's a baseline.\n\nI audit a lot of student projects and the most common issues I see:\n\n❌ Images with no alt text\n❌ Colour contrast ratios below 4.5:1\n❌ Forms with no labels (just placeholders)\n❌ No keyboard navigation support\n❌ Clickable elements that aren't buttons or links\n\nNone of these are hard to fix. WCAG 2.1 is your friend. axe DevTools browser extension will catch most of these automatically.\n\nMake the web work for everyone. 🌍\n\n#Accessibility #WebDev #UX #Inclusion` },
    { email: 'ryan.oconnor@decp.io', content: `Six months into building my dissertation project — a distributed key-value store in Go — and I finally understand why database papers are written the way they are.\n\nThe gap between "I understand Raft conceptually" and "I implemented Raft and it works correctly under network partition" is ENORMOUS.\n\nIf you're serious about backend engineering, build something that involves:\n• Consensus protocols\n• Write-ahead logging\n• Compaction\n• Lease-based reads\n\nYou will never look at databases the same way again. #Go #DistributedSystems #Databases` },
    { email: 'maya.patel@decp.io', content: `Reading list for anyone getting into causal inference — these three resources will take you from zero to genuinely dangerous:\n\n📗 "The Book of Why" by Pearl & Mackenzie — intuition builder\n📕 "Causal Inference: The Mixtape" by Cunningham — applied stats focus, free online\n📘 "Elements of Causal Inference" by Peters, Janzing & Schölkopf — rigorous ML perspective\n\nStart with Pearl, go to Mixtape for applications, then hit Peters when you want to cry productively.\n\n#CausalInference #MachineLearning #Research #Statistics` },
    { email: 'jake.morrison@decp.io', content: `Finished a red team engagement this week (with permission, obviously 😄) and the easiest foothold we found was predictable.\n\nSSH keys committed to git repos. In 2026. Still.\n\nA quick reminder of the hygiene basics everyone should know:\n\n🔑 Use git-secrets or gitleaks pre-commit hooks\n🔑 Rotate any secret that touched version control, always\n🔑 Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler)\n🔑 Audit your public repos monthly\n\nSecurity is everyone's job, not just the security team's.\n\n#Cybersecurity #SecDevOps #EthicalHacking` },
    { email: 'chloe.zhang@decp.io', content: `Three things I learned being PM of the DEC Entrepreneurship Society this year:\n\n1. Saying no is a product skill. Every yes is a no to something else. Be explicit about what you're deprioritising.\n\n2. Users lie. Not maliciously — they tell you what they think you want to hear, or what they wish were true. Watch what they do, not what they say.\n\n3. Momentum beats perfection. Ship the ugly version. Learn from it. The teams who iterate win every time.\n\nApplying all of this now as I look for PM roles. If you know of any junior PM openings, please tag me! 🙏\n\n#ProductManagement #Entrepreneurship #StartupLife` },
  ];
}

const JOBS = [
  {
    email: 'sarah.chen@decp.io',
    job: {
      title: 'Machine Learning Engineer Intern',
      company: 'Google DeepMind',
      location: 'London, UK (Hybrid)',
      type: 'internship',
      description: 'Join Google\'s ML infrastructure team for a 12-week summer internship. You\'ll work on real production ML pipelines serving billions of requests per day. Projects include improving model serving latency, building evaluation frameworks, and contributing to our internal ML platform.\n\nThis is a paid internship (competitive stipend + housing allowance). You will be paired with a senior engineer mentor and attend weekly tech talks from Google researchers.\n\nIdeal for penultimate or final year students with strong Python and ML fundamentals.',
      requirements: ['Python', 'TensorFlow or PyTorch', 'Strong CS fundamentals', 'Linear algebra & probability', 'Git'],
    }
  },
  {
    email: 'marcus.t@decp.io',
    job: {
      title: 'Product Management Intern',
      company: 'Stripe',
      location: 'London, UK (Hybrid)',
      type: 'internship',
      description: 'Stripe is looking for a Product Management intern to join our Payments team. You\'ll own a meaningful product area for the summer, running user research, defining requirements, and working closely with engineering to ship improvements.\n\nStripe processes hundreds of billions in payments annually. The decisions you make will affect real businesses.\n\nYou\'ll attend PM reviews, present to senior leadership, and receive structured mentoring from senior PMs. We\'re looking for analytical thinkers who can balance user empathy with business rigour.',
      requirements: ['Analytical thinking', 'Clear written communication', 'SQL or data analysis experience', 'User research interest', 'Previous PM or product experience a plus'],
    }
  },
  {
    email: 'aisha.patel@decp.io',
    job: {
      title: 'AI Research Intern',
      company: 'DeepMind',
      location: 'London, UK (On-site)',
      type: 'internship',
      description: 'DeepMind is seeking exceptional research interns to join our teams working on foundational AI problems. Interns are treated as full research scientists — you\'ll contribute to projects with real scientific impact, potentially leading to co-authored publications.\n\nPrevious interns have contributed to papers published at NeurIPS, ICML, and ICLR.\n\nThis is a highly competitive position. We are looking for students with strong mathematical foundations, prior research experience, and evidence of independent scientific thinking.',
      requirements: ['PhD student or exceptional final-year Masters', 'Strong linear algebra, probability & optimisation', 'Deep learning expertise (PyTorch preferred)', 'Prior publications or preprints a strong plus', 'Research problem-solving ability'],
    }
  },
  {
    email: 'james.obrien@decp.io',
    job: {
      title: 'Backend Engineer (Go)',
      company: 'NexaTech',
      location: 'London, UK (Hybrid)',
      type: 'full-time',
      description: 'NexaTech is building the real-time data infrastructure layer for European fintech. We\'ve just closed our Series A and are scaling rapidly. We\'re looking for a backend engineer to join our core platform team.\n\nYou\'ll be working on our distributed event streaming system, designing APIs consumed by major fintech clients, and helping architect our next-generation data plane.\n\nAs an early hire you\'ll have huge scope and equity. We genuinely want to hire from DEC — we know the calibre of students here.\n\nFull-time role with competitive salary, equity, and a proper engineering culture.',
      requirements: ['Go (or strong desire to learn)', 'Distributed systems understanding', 'PostgreSQL or similar', 'Experience with event-driven architectures', 'Kubernetes basics a plus'],
    }
  },
  {
    email: 'elena.r@decp.io',
    job: {
      title: 'Data Scientist — Trust & Integrity',
      company: 'Meta',
      location: 'London, UK (Hybrid)',
      type: 'full-time',
      description: 'Meta\'s Trust & Integrity team is looking for a data scientist to join our efforts to keep the platform safe and fair at scale. You\'ll use statistical modelling, ML, and large-scale data analysis to understand and mitigate harmful patterns across our platforms.\n\nThis is meaningful, challenging work. You\'ll be at the intersection of social science, machine learning, and policy — working on problems that genuinely matter.\n\nStrong analytical background required. Experience with Spark, SQL, and Python is essential. Previous work in trust, safety, or fairness research is a significant plus.',
      requirements: ['Python (Pandas, Scikit-learn)', 'SQL at scale', 'Spark or similar big data tools', 'Statistical modelling', 'Excellent communication skills', 'Interest in fairness and integrity problems'],
    }
  },
];

const EVENTS = [
  {
    title: 'DEC Tech Career Fair 2026',
    description: 'The biggest DEC career event of the year! 25+ companies attending including Google, Stripe, DeepMind, Palantir, Jane Street, Monzo, and many more. Bring your CV, dress smart, and come ready to talk to recruiters and engineers.\n\nThere will be structured networking sessions, a panel discussion on the current tech job market, and a CV review station staffed by alumni volunteers.\n\nFree to attend. Register your place early — spots are limited.',
    eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'DEC Main Auditorium, Building A',
  },
  {
    title: 'Alumni Networking Night: AI & ML Edition',
    description: 'An intimate evening for students interested in AI and machine learning to connect with alumni working at the forefront of the field. Alumni confirmed: Dr. Aisha Patel (DeepMind), plus guests from Anthropic, Waymo, and Hugging Face.\n\nFormat: 10 min lightning talks from alumni, followed by open networking with drinks and food provided. Great opportunity to ask the questions you can\'t find on LinkedIn.\n\nLimited to 40 students — RSVP required.',
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'DEC Innovation Hub, Room 204',
  },
  {
    title: 'Student Research Symposium 2026',
    description: 'Present your research to an audience of peers, faculty, and industry guests. This year\'s symposium features 18 student presentations across tracks in AI, Systems, Security, HCI, and Theory.\n\nBest paper award: £500 and guaranteed publication in the DEC Research Journal. All presentations will be recorded and posted to the DEC YouTube channel.\n\nOpen to all students and alumni. Presenting students must register their abstract by 1 week before the event.',
    eventDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'DEC Conference Centre, Hall B',
  },
];

const RESEARCH_PROJECTS = [
  {
    email: 'aisha.patel@decp.io',
    project: {
      title: 'Causal Representation Learning for NLP',
      description: 'We are building methods to improve the robustness of NLP models by incorporating causal structure into representation learning. The goal is models that generalise across domains without requiring retraining.\n\nLooking for students with strong ML backgrounds and ideally some exposure to causal inference. We meet weekly and expect 10-15 hours of contribution per week.',
      domain: 'Machine Learning',
      tags: ['NLP', 'Causal Inference', 'Deep Learning', 'Research'],
    }
  },
  {
    email: 'james.obrien@decp.io',
    project: {
      title: 'Open Source Distributed Key-Value Store',
      description: 'Building a production-quality distributed key-value store in Go as a learning and reference implementation of the Raft consensus protocol. The goal is something that could genuinely be used in small production systems — not just a toy.\n\nContributors will learn: Raft consensus, leader election, log replication, snapshotting, linearisable reads, and gRPC API design.\n\nAll levels welcome — from students who have never read a distributed systems paper to those who have.',
      domain: 'Distributed Systems',
      tags: ['Go', 'Raft', 'Databases', 'Open Source'],
    }
  },
  {
    email: 'jake.morrison@decp.io',
    project: {
      title: 'Automated Vulnerability Detection with LLMs',
      description: 'Exploring whether large language models can reliably detect security vulnerabilities in C/C++ code — and whether they can suggest correct patches. We\'re building a benchmark dataset and evaluation framework.\n\nThis sits at the intersection of security research and ML. We\'re looking for students with either a security background or ML background (ideally both, but one is fine).\n\nOutput: aiming for a paper submission to IEEE S&P or USENIX Security.',
      domain: 'Cybersecurity',
      tags: ['Security', 'LLMs', 'Vulnerability Detection', 'Research'],
    }
  },
];

// ─── Messages ────────────────────────────────────────────────────────────────
const CONVERSATIONS = [
  {
    from: 'liam.foster@decp.io',
    to: 'sarah.chen@decp.io',
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
    from: 'priya.sharma@decp.io',
    to: 'aisha.patel@decp.io',
    messages: [
      { sender: 'priya.sharma@decp.io', content: "Dr. Patel! Congratulations on the ICML paper — I read the preprint and the cross-lingual transfer results are really impressive. I'm working on something adjacent and wondering if you'd be open to a chat?" },
      { sender: 'aisha.patel@decp.io', content: "Thank you Priya! Of course, always happy to talk research. What are you working on?" },
      { sender: 'priya.sharma@decp.io', content: "I'm trying to apply causal intervention methods to improve cross-lingual coreference — the idea is to disentangle semantic and syntactic representations for more robust transfer. Still very early but I think there's something there." },
      { sender: 'aisha.patel@decp.io', content: "This is very timely — we just started a project on exactly this intersection. The challenge is defining what 'intervention' means in a multilingual setting where the causal graph changes across languages. Have you read the Feder et al. survey on causality in NLP?" },
      { sender: 'priya.sharma@decp.io', content: "Yes, it's what got me thinking about this direction! I hadn't thought about the cross-lingual causal graph problem though — that's a really interesting framing. Would you be open to me joining your research group for this semester?" },
      { sender: 'aisha.patel@decp.io', content: "Absolutely — let's set up a proper meeting with the team. Are you free Fridays? We do our weekly group meeting at 11am. Come this Friday and see if it's a fit before committing." },
    ]
  },
  {
    from: 'omar.hassan@decp.io',
    to: 'marcus.t@decp.io',
    messages: [
      { sender: 'omar.hassan@decp.io', content: "Hi Marcus, I'm applying for the PM internship at Stripe. I have a strong engineering background but I'm making the switch to product. Any tips on what Stripe looks for specifically?" },
      { sender: 'marcus.t@decp.io', content: "Hey Omar! Great that you're applying. Stripe looks for people who can go deep technically AND communicate clearly to non-technical audiences. The case study round will test your analytical thinking — make sure you quantify everything and clearly state your assumptions." },
      { sender: 'omar.hassan@decp.io', content: "That's useful. For the case study, should I focus more on the user research side or the metrics side?" },
      { sender: 'marcus.t@decp.io', content: "Both matter but Stripe is very metric-driven. Always anchor your decisions to numbers. If you say 'improve developer experience', define how you'd measure it — time to first successful API call, support ticket rate, whatever. Vague answers don't land here." },
      { sender: 'omar.hassan@decp.io', content: "Got it. One more question — I see the JD mentions the Developer Experience team specifically. Is that different from Payments? Which would you recommend for an engineer trying to break into PM?" },
      { sender: 'marcus.t@decp.io', content: "DevEx is fantastic for an engineer transitioning to PM — you'd still be close to the technical details. Payments is more complex domain knowledge upfront. I'd say DevEx is the stronger choice for your background. Mention in your cover letter why developer tooling excites you specifically." },
    ]
  },
  {
    from: 'sophie.w@decp.io',
    to: 'elena.r@decp.io',
    messages: [
      { sender: 'sophie.w@decp.io', content: "Hi Elena! I saw your post about data science portfolios and it really resonated. I'm applying for data science roles at fintech companies and wondering if you'd have 20 minutes to look at my portfolio?" },
      { sender: 'elena.r@decp.io', content: "Of course Sophie! Send it over and I'll take a look before we chat. I do portfolio reviews the last Friday of the month but I can make time for you before that." },
      { sender: 'sophie.w@decp.io', content: "Thank you so much! The main project is a customer lifetime value model I built for a local e-commerce company as a freelance project. I'm quite proud of the feature engineering but I'm not sure if the business framing is strong enough." },
      { sender: 'elena.r@decp.io', content: "CLV is a great choice — it's directly business-relevant and tests real skills. The key question is: can you articulate the expected ROI of using your model versus the status quo? That's what interviewers will focus on at fintech companies." },
      { sender: 'sophie.w@decp.io', content: "I have the numbers — the model would reduce churn-related revenue loss by around 18% based on back-testing. I just wasn't sure how prominently to feature that in the write-up." },
      { sender: 'elena.r@decp.io', content: "Lead with that number. Literally the first sentence. 'I built a model that reduces churn revenue loss by 18%.' Everything else is the supporting story. Data scientists bury their results — don't do that. Send me the GitHub link!" },
    ]
  },
  {
    from: 'ethan.kim@decp.io',
    to: 'james.obrien@decp.io',
    messages: [
      { sender: 'ethan.kim@decp.io', content: "James, I've been following NexaTech for a while. Congratulations on the Series A! I'm really interested in the Backend Engineer role. I've been building a Kubernetes operator in Go for my dissertation — is that the kind of thing that would be relevant?" },
      { sender: 'james.obrien@decp.io', content: "Ethan — yes, absolutely relevant! A custom Kubernetes operator is non-trivial and shows real Go and cloud-native understanding. That would stand out in your application. Tell me more about what the operator does?" },
      { sender: 'ethan.kim@decp.io', content: "It's a stateful workload operator for distributed ML training jobs — it handles dynamic scaling of parameter servers, automatic fault recovery, and checkpointing to S3. It uses the controller-runtime library and I wrote a custom CRD schema." },
      { sender: 'james.obrien@decp.io', content: "OK I'm impressed. That's genuinely production-grade work. Please apply through the jobs board and mention this project in detail. I'll flag your application personally to the hiring team. Do you have a GitHub link I can share?" },
      { sender: 'ethan.kim@decp.io', content: "Yes! It's public on GitHub under ethan-kim-dev/k8s-ml-operator. I've also written a blog post explaining the architecture decisions. Thank you so much James — this means a lot!" },
      { sender: 'james.obrien@decp.io', content: "Just had a look — really solid code quality and the README is excellent. Apply today. I'm going to share this with our Platform Lead. We might fast-track you to the technical round directly. Welcome aboard (provisionally 😄)." },
    ]
  },
  // Student to student
  {
    from: 'liam.foster@decp.io',
    to: 'omar.hassan@decp.io',
    messages: [
      { sender: 'liam.foster@decp.io', content: "Mate your hackathon win was insane. The sign language thing is genuinely cool. Are you actually going to build it out?" },
      { sender: 'omar.hassan@decp.io', content: "We're thinking about it! There's definitely demand — a few deaf advocacy groups reached out after we posted the GitHub repo. Need to figure out if it's viable as a startup or just a very good open source project." },
      { sender: 'liam.foster@decp.io', content: "Have you spoken to Chloe? She's the PM Society president and she'd probably have thoughts on the startup vs open source question. Also she knows people." },
      { sender: 'omar.hassan@decp.io', content: "Actually no, good shout. I'll reach out to her. Hey are you going to the career fair in two weeks? Should we do a group trip with the usual crew?" },
      { sender: 'liam.foster@decp.io', content: "100% yes. I need to talk to the Google recruiters specifically. Want to grab lunch before and do a quick mock interview prep session? I'm meeting Sarah Chen for a proper session Tuesday but a warm-up would help." },
      { sender: 'omar.hassan@decp.io', content: "Perfect. Noon on the career fair day, the usual café? I'll let Ethan and Sophie know too." },
    ]
  },
  {
    from: 'maya.patel@decp.io',
    to: 'priya.sharma@decp.io',
    messages: [
      { sender: 'maya.patel@decp.io', content: "Priya! Congratulations on the EMNLP acceptance — that's massive for a solo paper! Did you submit it as a workshop paper or main conference?" },
      { sender: 'priya.sharma@decp.io', content: "Workshop paper! Still very happy though — it's my first peer-reviewed publication and it gives me something concrete to put on my PhD applications. Are you applying for PhDs this cycle?" },
      { sender: 'maya.patel@decp.io', content: "I'm already in one! Just started my first year. It's both amazing and terrifying. The freedom is unlike anything in undergrad but the pressure to produce original work is real." },
      { sender: 'priya.sharma@decp.io', content: "Oh wow! I didn't realise you'd already started. What's your research on? I saw your post on causal inference reading lists." },
      { sender: 'maya.patel@decp.io', content: "Fairness and causality in hiring algorithms. Basically: can we use causal methods to detect and mitigate discrimination in automated decision systems. It connects social science, ML, and philosophy in ways I didn't expect." },
      { sender: 'priya.sharma@decp.io', content: "That sounds so important right now. There are so many papers on 'fairness' that don't actually engage with what fairness means causally. If you ever want a second pair of eyes on anything, I'd love to read it." },
    ]
  },
  {
    from: 'anika.gupta@decp.io',
    to: 'chloe.zhang@decp.io',
    messages: [
      { sender: 'anika.gupta@decp.io', content: "Chloe! I loved your post on product lessons from running the society. The 'users lie' point is so true — I learned that the hard way on a UX project where every user said they'd use the dark mode and then exactly zero of them did." },
      { sender: 'chloe.zhang@decp.io', content: "EXACTLY. I've started doing usability sessions where I just watch people use the thing without asking any questions. You learn more in 20 minutes of observation than in an hour of interviews." },
      { sender: 'anika.gupta@decp.io', content: "That's a great approach. Have you tried unmoderated remote testing? I've been using Maze for a project and the async nature means you get more honest behaviour." },
      { sender: 'chloe.zhang@decp.io', content: "I haven't but I should! Maze looks great for quick validation. I've been using Hotjar for heatmaps but it feels a bit indirect. The problem is we never have enough users for statistical significance in the society projects." },
      { sender: 'anika.gupta@decp.io', content: "Story of my life 😄 Hey, are you coming to the symposium? I'm presenting my accessibility audit tool. Would love your take on the product positioning after." },
      { sender: 'chloe.zhang@decp.io', content: "Yes! I'm coming to support Ryan's presentation too. Shall we grab a coffee beforehand and go through your pitch? I've been thinking about how to frame accessibility tools for a business audience and I might have useful input." },
    ]
  },
];

// ─── Main Population Function ─────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 DEC Platform Population Script\n');
  const tokens = {}; // email → accessToken
  const userIds = {}; // email → userId

  // ── Step 1: Register + login all users ─────────────────────────────────────
  console.log('📋 Step 1: Creating user accounts...');
  const allUsers = [
    ...ALUMNI.map(u => ({ ...u, role: 'alumni' })),
    ...STUDENTS.map(u => ({ ...u, role: 'student' })),
  ];

  for (const u of allUsers) {
    try {
      const d = await register(u.name, u.email, u.role);
      tokens[u.email] = d.accessToken;
      userIds[u.email] = d.userId;
      // Decode role from JWT
      const payload = JSON.parse(Buffer.from(d.accessToken.split('.')[1], 'base64').toString());
      console.log(`  ✅ ${u.name} (${payload.role}) — ${u.email}`);
      await sleep(200);
    } catch (e) {
      console.log(`  ⚠️  ${u.email}: ${e.message}`);
    }
  }

  // ── Step 1b: Admin login ────────────────────────────────────────────────────
  try {
    const d = await login('admin@decp.io');
    tokens['admin@decp.io'] = d.accessToken;
    userIds['admin@decp.io'] = d.userId;
    console.log('  ✅ Admin — admin@decp.io');
  } catch(e) { console.log('  ⚠️  admin login failed:', e.message); }

  // ── Step 2: Set up profiles ─────────────────────────────────────────────────
  console.log('\n👤 Step 2: Setting up profiles...');
  for (const u of allUsers) {
    if (!tokens[u.email]) continue;
    const r = await api(tokens[u.email]).put('/api/v1/users/me', {
      name: u.name, bio: u.bio, skills: u.skills,
    });
    if (r.data.success) console.log(`  ✅ Profile: ${u.name}`);
    else console.log(`  ⚠️  Profile failed: ${u.name}:`, r.data);
    await sleep(150);
  }

  // ── Step 3: Follow relationships ────────────────────────────────────────────
  console.log('\n👥 Step 3: Setting up follows...');
  const followPairs = [
    // All students follow all alumni
    ...STUDENTS.flatMap(s => ALUMNI.map(a => ({ from: s.email, to: a.email }))),
    // Some cross-student follows
    ['liam.foster@decp.io', 'omar.hassan@decp.io'],
    ['omar.hassan@decp.io', 'liam.foster@decp.io'],
    ['priya.sharma@decp.io', 'maya.patel@decp.io'],
    ['maya.patel@decp.io', 'priya.sharma@decp.io'],
    ['anika.gupta@decp.io', 'chloe.zhang@decp.io'],
    ['chloe.zhang@decp.io', 'anika.gupta@decp.io'],
    ['ethan.kim@decp.io', 'ryan.oconnor@decp.io'],
    ['sophie.w@decp.io', 'anika.gupta@decp.io'],
    ['jake.morrison@decp.io', 'ryan.oconnor@decp.io'],
  ].map(p => Array.isArray(p) ? { from: p[0], to: p[1] } : p);

  for (const { from, to } of followPairs) {
    if (!tokens[from] || !userIds[to]) continue;
    await api(tokens[from]).post(`/api/v1/users/${userIds[to]}/follow`);
    await sleep(80);
  }
  console.log(`  ✅ Created ${followPairs.length} follow relationships`);

  // ── Step 4: Feed posts ───────────────────────────────────────────────────────
  console.log('\n📝 Step 4: Creating feed posts...');
  const postIds = {};
  const posts = getAlumniPosts();
  for (const p of posts) {
    if (!tokens[p.email]) continue;
    const r = await api(tokens[p.email]).post('/api/v1/feed/posts', {
      content: p.content, mediaUrls: [],
    });
    if (r.data.success) {
      const email = p.email;
      if (!postIds[email]) postIds[email] = [];
      postIds[email].push(r.data.data._id);
      console.log(`  ✅ Post by ${p.email.split('@')[0]}: "${p.content.slice(0, 50)}..."`);
    }
    await sleep(200);
  }

  // ── Step 5: Likes ───────────────────────────────────────────────────────────
  console.log('\n❤️  Step 5: Adding likes...');
  const allPostIds = Object.values(postIds).flat();
  // Each student likes ~60% of posts, each alumni likes ~40%
  const likers = [...STUDENTS.map(s => s.email), ...ALUMNI.map(a => a.email)];
  let likeCount = 0;
  for (const postId of allPostIds) {
    for (const liker of likers) {
      if (!tokens[liker] || Math.random() > 0.55) continue;
      await api(tokens[liker]).post(`/api/v1/feed/posts/${postId}/like`);
      likeCount++;
      await sleep(60);
    }
  }
  console.log(`  ✅ Added ${likeCount} likes`);

  // ── Step 6: Comments ─────────────────────────────────────────────────────────
  console.log('\n💬 Step 6: Adding comments...');
  const commentBank = [
    "This is exactly what I needed to hear. Thank you for sharing!",
    "Really valuable perspective. I've been thinking about this too.",
    "Saving this for my job hunt. The framing here is spot on.",
    "Agreed 100%. The gap between knowing and doing is enormous.",
    "Would love to hear more about the technical details here.",
    "This is gold. Sharing with my study group immediately.",
    "The point about communication vs coding is underrated.",
    "Congratulations! Well deserved recognition for solid work.",
    "This matches my experience too — great reminder to keep it practical.",
    "Super useful breakdown. Bookmarked.",
    "Love that you're open to mentoring — that makes a real difference.",
    "The bit about users lying is painfully accurate 😅",
    "Can confirm — built a Raft implementation and I lost several weeks of my life to it.",
    "Thank you for normalising failure as part of the learning process.",
    "More alumni should post like this. Very real and actionable.",
  ];

  let commentCount = 0;
  for (const postId of allPostIds.slice(0, 18)) { // comment on first 18 posts
    const numComments = Math.floor(Math.random() * 3) + 1;
    const commenters = likers.sort(() => Math.random() - 0.5).slice(0, numComments);
    for (const commenter of commenters) {
      if (!tokens[commenter]) continue;
      const comment = commentBank[Math.floor(Math.random() * commentBank.length)];
      await api(tokens[commenter]).post(`/api/v1/feed/posts/${postId}/comments`, { content: comment });
      commentCount++;
      await sleep(100);
    }
  }
  console.log(`  ✅ Added ${commentCount} comments`);

  // ── Step 7: Jobs ─────────────────────────────────────────────────────────────
  console.log('\n💼 Step 7: Posting jobs...');
  const jobIds = [];
  for (const j of JOBS) {
    if (!tokens[j.email]) continue;
    const r = await api(tokens[j.email]).post('/api/v1/jobs', j.job);
    if (r.data.success) {
      jobIds.push({ id: r.data.data._id, poster: j.email, ...j.job });
      console.log(`  ✅ Job: "${j.job.title}" at ${j.job.company}`);
    } else console.log(`  ⚠️  Job failed:`, r.data);
    await sleep(200);
  }

  // ── Step 8: Applications ─────────────────────────────────────────────────────
  console.log('\n📨 Step 8: Students applying to jobs...');
  const coverLetters = {
    'Machine Learning Engineer Intern': [
      { email: 'priya.sharma@decp.io', cl: "I am writing to apply for the ML Engineer Intern role at Google DeepMind. My MSc in AI has given me deep expertise in NLP and multimodal learning, with a particular focus on cross-lingual transfer — directly relevant to your ML infrastructure work. I recently had a workshop paper accepted at EMNLP 2026 and am comfortable working with large-scale PyTorch training pipelines. I would bring genuine research rigour and a willingness to do the hard engineering work that makes ML systems production-ready.", cv: "https://cv.example.com/priya-sharma" },
      { email: 'maya.patel@decp.io', cl: "As a first-year PhD student in causal ML, I am excited by the opportunity to bring a research perspective to ML engineering at Google. My background in statistical modelling, fairness methods, and PyTorch, combined with my TA experience communicating complex concepts, makes me well-suited to both the technical and collaborative aspects of this role.", cv: "https://cv.example.com/maya-patel" },
      { email: 'ethan.kim@decp.io', cl: "While my primary focus has been infrastructure and DevOps, I have been expanding into ML engineering through my dissertation work on Kubernetes operators for distributed ML training. This role excites me because it sits at exactly this intersection. I understand the infrastructure constraints that ML teams face and can work effectively across the stack.", cv: "https://cv.example.com/ethan-kim" },
    ],
    'Product Management Intern': [
      { email: 'chloe.zhang@decp.io', cl: "I have spent the past year as PM of DEC's Entrepreneurship Society, defining our product roadmap, running user research, and coordinating across a team of 15. This has given me hands-on PM experience beyond what any coursework can provide. Stripe's developer focus is particularly exciting to me — my engineering background means I can read code, understand technical constraints, and earn trust with engineering teams quickly.", cv: "https://cv.example.com/chloe-zhang" },
      { email: 'omar.hassan@decp.io', cl: "I am an engineer who wants to build better products, not just features. My experience as a freelance developer has taught me how to rapidly understand user needs and translate them into technical requirements. I have shipped five products to real users, each informed by user interviews and data analysis. I am particularly excited about Stripe's Developer Experience team — I know the pain of poor API documentation firsthand.", cv: "https://cv.example.com/omar-hassan" },
      { email: 'sophie.w@decp.io', cl: "My combination of mathematical rigour and communication skills makes me effective at the data-to-decision pipeline that PM work requires. I have worked as a freelance data analyst and presented insights to C-suite stakeholders — I know how to make numbers tell a story. Stripe's metrics-first culture is exactly what I want to work in.", cv: "https://cv.example.com/sophie-williams" },
    ],
    'AI Research Intern': [
      { email: 'priya.sharma@decp.io', cl: "I am a first author on a peer-reviewed workshop paper at EMNLP 2026 and am currently exploring causal representation learning for NLP robustness. Dr. Aisha Patel has been a mentor throughout my MSc and I am familiar with DeepMind's research culture from her guidance. I am prepared for the rigour and independence that a research internship at DeepMind demands.", cv: "https://cv.example.com/priya-sharma" },
      { email: 'maya.patel@decp.io', cl: "As a PhD student working on causal fairness in ML systems, I have the independent research skills and theoretical foundations to contribute immediately to DeepMind's research agenda. I have read extensively across the literature in representation learning, fairness, and causal inference. I am comfortable with ambiguity and driven by scientific curiosity.", cv: "https://cv.example.com/maya-patel" },
    ],
    'Backend Engineer (Go)': [
      { email: 'ethan.kim@decp.io', cl: "I have been building a production-quality Kubernetes operator in Go for my dissertation — a stateful workload manager for distributed ML training. This has given me deep experience with Go's concurrency model, the Kubernetes API, and distributed systems patterns. NexaTech's real-time infrastructure work is exactly where I want to apply these skills. James has seen the code and I hope it speaks for itself.", cv: "https://cv.example.com/ethan-kim" },
      { email: 'ryan.oconnor@decp.io', cl: "My dissertation is a distributed key-value store implementing the Raft consensus protocol in Go. I have implemented leader election, log replication, snapshotting, and linearisable reads from scratch. This has given me rare depth in both the Go language and distributed systems theory. NexaTech's event streaming challenges excite me enormously.", cv: "https://cv.example.com/ryan-oconnor" },
      { email: 'liam.foster@decp.io', cl: "I am a full-stack engineer with strong backend instincts. While my primary languages are TypeScript and Node.js, I have been learning Go for six months and am comfortable with its idioms. I would bring strong fundamentals, the ability to learn fast, and genuine excitement about working at an early-stage company where scope is large.", cv: "https://cv.example.com/liam-foster" },
    ],
    'Data Scientist — Trust & Integrity': [
      { email: 'sophie.w@decp.io', cl: "My MSc in Data Science and background in mathematical modelling prepare me well for the statistical rigour that Meta's Trust team requires. I have experience with causal methods and A/B testing from coursework and freelance projects, and I care deeply about making algorithmic systems fair and safe. The Trust & Integrity mission resonates with me personally.", cv: "https://cv.example.com/sophie-williams" },
      { email: 'maya.patel@decp.io', cl: "My PhD research on causal fairness in automated decision systems is directly relevant to Meta's Trust & Integrity work. I bring expertise in causal inference, statistical modelling, and Python/Spark, combined with deep thinking about the ethical dimensions of algorithmic systems. I would be thrilled to apply this work at scale.", cv: "https://cv.example.com/maya-patel" },
      { email: 'priya.sharma@decp.io', cl: "The intersection of ML and integrity is something I think about a lot — my NLP research touches on bias in language models. I bring strong Python, solid SQL, and the analytical mindset to work with very large datasets. Working at Meta on problems that affect billions of users would be the most impactful application of my skills.", cv: "https://cv.example.com/priya-sharma" },
    ],
  };

  for (const job of jobIds) {
    const applicants = coverLetters[job.title] || [];
    for (const app of applicants) {
      if (!tokens[app.email]) continue;
      const r = await api(tokens[app.email]).post(`/api/v1/jobs/${job.id}/apply`, {
        coverLetter: app.cl, cvUrl: app.cv,
      });
      if (r.data.success) console.log(`  ✅ ${app.email.split('@')[0]} → ${job.title}`);
      else console.log(`  ⚠️  Apply failed (${app.email} → ${job.title}):`, r.data.error);
      await sleep(150);
    }
  }

  // Accept one application per job to show status variety
  for (const job of jobIds) {
    const appsR = await api(tokens[job.poster]).get(`/api/v1/jobs/${job.id}/applications`);
    if (!appsR.data.success || !appsR.data.data.length) continue;
    // Accept first applicant
    const firstApp = appsR.data.data[0];
    await api(tokens[job.poster]).put(`/api/v1/jobs/${job.id}/applications/${firstApp._id}`, { status: 'accepted' });
    // Reject second if exists
    if (appsR.data.data[1]) {
      await api(tokens[job.poster]).put(`/api/v1/jobs/${job.id}/applications/${appsR.data.data[1]._id}`, { status: 'rejected' });
    }
    console.log(`  ✅ Status updated for ${job.title} applications`);
    await sleep(150);
  }

  // ── Step 9: Events ───────────────────────────────────────────────────────────
  console.log('\n📅 Step 9: Creating events...');
  const eventIds = [];
  for (const ev of EVENTS) {
    const r = await api(tokens['admin@decp.io']).post('/api/v1/events', ev);
    if (r.data.success) {
      eventIds.push(r.data.data._id);
      console.log(`  ✅ Event: "${ev.title}"`);
    }
    await sleep(200);
  }

  // RSVPs
  const rsvpUsers = [...STUDENTS.map(s => s.email), ...ALUMNI.map(a => a.email)];
  for (const evId of eventIds) {
    for (const u of rsvpUsers) {
      if (!tokens[u] || Math.random() > 0.6) continue;
      await api(tokens[u]).post(`/api/v1/events/${evId}/rsvp`);
      await sleep(60);
    }
  }
  console.log(`  ✅ RSVPs added`);

  // ── Step 10: Research projects ───────────────────────────────────────────────
  console.log('\n🔬 Step 10: Creating research projects...');
  const projectIds = [];
  for (const rp of RESEARCH_PROJECTS) {
    if (!tokens[rp.email]) continue;
    const r = await api(tokens[rp.email]).post('/api/v1/research', rp.project);
    if (r.data.success) {
      projectIds.push(r.data.data._id);
      console.log(`  ✅ Project: "${rp.project.title}"`);
    }
    await sleep(200);
  }

  // Students join projects
  const joinPairs = [
    { student: 'priya.sharma@decp.io', projectIdx: 0 },
    { student: 'maya.patel@decp.io',   projectIdx: 0 },
    { student: 'ryan.oconnor@decp.io', projectIdx: 1 },
    { student: 'ethan.kim@decp.io',    projectIdx: 1 },
    { student: 'liam.foster@decp.io',  projectIdx: 1 },
    { student: 'jake.morrison@decp.io',projectIdx: 2 },
    { student: 'ryan.oconnor@decp.io', projectIdx: 2 },
  ];
  for (const jp of joinPairs) {
    const pid = projectIds[jp.projectIdx];
    if (!pid || !tokens[jp.student]) continue;
    await api(tokens[jp.student]).post(`/api/v1/research/${pid}/join`);
    await sleep(100);
  }
  console.log(`  ✅ Students joined projects`);

  // ── Step 11: Messages ─────────────────────────────────────────────────────────
  console.log('\n💬 Step 11: Seeding conversations...');
  for (const conv of CONVERSATIONS) {
    for (const msg of conv.messages) {
      const senderToken = tokens[msg.sender];
      const recipientEmail = msg.sender === conv.from ? conv.to : conv.from;
      const recipientId = userIds[recipientEmail];
      if (!senderToken || !recipientId) continue;
      await api(senderToken).post('/api/v1/messages/send', {
        recipientId,
        content: msg.content,
      });
      await sleep(120);
    }
    console.log(`  ✅ Conversation: ${conv.from.split('@')[0]} ↔ ${conv.to.split('@')[0]}`);
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  console.log('\n✨ Population complete!\n');
  console.log('Accounts created:');
  console.log('  Alumni (5):');
  ALUMNI.forEach(a => console.log(`    ${a.name.padEnd(22)} ${a.email}  /  ${PASS}`));
  console.log('  Students (10):');
  STUDENTS.forEach(s => console.log(`    ${s.name.padEnd(22)} ${s.email}  /  ${PASS}`));
  console.log('  Admin:         admin@decp.io  /  Admin1234\n');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
