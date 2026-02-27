const z = require('zod');
const ResearchProject = require('../models/ResearchProject');

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
    const project = await ResearchProject.create({
      ...data,
      creatorId: userId,
      creatorName: req.headers['x-user-name'] || 'Unknown',
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

    if (!project.collaboratorIds.includes(userId)) {
      project.collaboratorIds.push(userId);
      await project.save();
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
