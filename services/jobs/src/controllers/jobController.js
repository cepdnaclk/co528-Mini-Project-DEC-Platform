const Job = require('../models/Job');
const { z } = require('zod');
const internalClient = require('../../lib/internalClient');
const { publish } = require('../../lib/pubsub');
const asyncHandler = require('express-async-handler');

// Validation schemas
const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  company: z.string().min(2, "Company is required"),
  location: z.string().min(2, "Location is required"),
  type: z.enum(['internship', 'full-time', 'part-time', 'contract']),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requirements: z.array(z.string()).optional()
});

const applySchema = z.object({
  coverLetter: z.string().min(10, "Cover letter must be at least 10 characters"),
  cvUrl: z.string().url("Must be a valid URL")
});

const createJob = asyncHandler(async (req, res) => {
  const role = req.headers['x-user-role'];
  const posterId = req.headers['x-user-id'];

  if (role !== 'admin' && role !== 'alumni') {
    return res.status(403).json({ success: false, error: 'Only alumni and admins can post jobs' });
  }

  // Fetch poster details
  let posterName = 'Unknown User';
  try {
    const userResp = await internalClient.get(`http://localhost:3002/api/v1/users/${posterId}`);
    if (userResp.data && userResp.data.data) {
      posterName = userResp.data.data.name;
    }
  } catch (err) {
    console.error('Failed to fetch user details:', err.message);
  }

  const job = new Job({
    ...req.body,
    posterId,
    posterName,
    active: true
  });

  await job.save();

  publish(process.env.PUBSUB_TOPIC_JOB_POSTED || 'decp.job.posted', { jobId: job._id });

  res.status(201).json({ success: true, data: job });
});

const getJobs = asyncHandler(async (req, res) => {
  const { type, active } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (active !== undefined) filter.active = active === 'true';

  const jobs = await Job.find(filter).sort({ createdAt: -1 }).select('-applications');
  res.json({ success: true, data: jobs });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).select('-applications');
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, data: job });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  if (role !== 'admin' && job.posterId !== userId) {
    return res.status(403).json({ success: false, error: 'Not authorized to update this job' });
  }

  const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-applications');
  res.json({ success: true, data: updatedJob });
});

const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  if (role !== 'admin' && job.posterId !== userId) {
    return res.status(403).json({ success: false, error: 'Not authorized to delete this job' });
  }

  await Job.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Job deleted' });
});

const applyJob = asyncHandler(async (req, res) => {
  const role = req.headers['x-user-role'];
  const studentId = req.headers['x-user-id'];

  if (role !== 'student') {
    return res.status(403).json({ success: false, error: 'Only students can apply for jobs' });
  }

  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
  if (!job.active) return res.status(400).json({ success: false, error: 'Job is no longer active' });

  // Check if already applied
  const alreadyApplied = job.applications.some(app => app.studentId === studentId);
  if (alreadyApplied) {
    return res.status(400).json({ success: false, error: 'You have already applied for this job' });
  }

  // Fetch student details
  let studentName = 'Unknown Student';
  try {
    const userResp = await internalClient.get(`http://localhost:3002/api/v1/users/${studentId}`);
    if (userResp.data && userResp.data.data) {
      studentName = userResp.data.data.name;
    }
  } catch (err) {
    console.error('Failed to fetch student details:', err.message);
  }

  const application = {
    studentId,
    studentName,
    coverLetter: req.body.coverLetter,
    cvUrl: req.body.cvUrl
  };

  job.applications.push(application);
  job.applicationCount = job.applications.length;
  await job.save();

  publish(process.env.PUBSUB_TOPIC_JOB_APPLIED || 'decp.job.applied', { jobId: job._id, studentId });

  res.status(201).json({ success: true, message: 'Application submitted successfully' });
});

const getApplications = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  if (role !== 'admin' && job.posterId !== userId) {
    return res.status(403).json({ success: false, error: 'Not authorized to view these applications' });
  }

  res.json({ success: true, data: job.applications });
});

module.exports = {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  applyJob,
  getApplications,
  jobSchema,
  applySchema
};
