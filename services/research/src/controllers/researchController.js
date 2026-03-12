const z = require('zod');
const ResearchProject = require('../models/ResearchProject');
const internalClient = require('../../lib/internalClient');

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  domain: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

exports.createProject = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const data = projectSchema.parse(req.body);

    let creatorName = 'Unknown';
    try {
      const userResp = await internalClient.get(`${process.env.USER_SERVICE_URL || 'http://user:3002'}/api/v1/users/${userId}`);
      if (userResp.data?.data?.name) creatorName = userResp.data.data.name;
    } catch (err) {
      console.error('Failed to fetch creator name:', err.message);
    }

    const project = await ResearchProject.create({
      ...data,
      creatorId: userId,
      creatorName,
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, error: err.errors });
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { domain, status, limit = 20 } = req.query;
    const query = {};
    if (domain) query.domain = domain;
    if (status) query.status = status;
    const projects = await ResearchProject.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await ResearchProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.joinProject = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const project = await ResearchProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    if (project.status === 'completed') return res.status(400).json({ success: false, error: 'Project is closed' });

    if (!project.collaboratorIds.includes(userId)) {
      project.collaboratorIds.push(userId);
      await project.save();
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.leaveProject = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const project = await ResearchProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    if (project.creatorId === userId) return res.status(400).json({ success: false, error: 'Creator cannot leave their own project' });

    project.collaboratorIds = project.collaboratorIds.filter(id => id !== userId);
    await project.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['open', 'in_progress', 'completed']).optional(),
});

exports.updateProject = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const project = await ResearchProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Not found' });
    if (project.creatorId !== userId && req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updates = updateProjectSchema.parse(req.body);
    Object.assign(project, updates);
    await project.save();
    res.json({ success: true, data: project });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, error: err.errors });
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
