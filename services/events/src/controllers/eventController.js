const Event = require('../models/Event');
const { z } = require('zod');
const internalClient = require('../../lib/internalClient');
const { publish } = require('../../lib/pubsub');
const asyncHandler = require('express-async-handler');

const eventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  eventDate: z.string().datetime(),
  location: z.string().min(2)
});

const createEvent = asyncHandler(async (req, res) => {
  const role = req.headers['x-user-role'];
  const creatorId = req.headers['x-user-id'];

  if (role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only admins can create events' });
  }

  // Fetch creator details
  let creatorName = 'Admin User';
  try {
    const userResp = await internalClient.get(`http://localhost:3002/api/v1/users/${creatorId}`);
    if (userResp.data && userResp.data.data) {
      creatorName = userResp.data.data.name;
    }
  } catch (err) {
    console.error('Failed to fetch user details:', err.message);
  }

  const event = new Event({
    ...req.body,
    creatorId,
    creatorName
  });

  await event.save();

  publish(process.env.PUBSUB_TOPIC_EVENT_CREATED || 'decp.event.created', { eventId: event._id });

  res.status(201).json({ success: true, data: event });
});

const getEvents = asyncHandler(async (req, res) => {
  const events = await Event.find()
    .sort({ eventDate: 1 })
    .select('-participantIds');
  res.json({ success: true, data: events });
});

const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
  
  res.json({ success: true, data: event });
});

const updateEvent = asyncHandler(async (req, res) => {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only admins can update events' });
  }

  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

  res.json({ success: true, data: event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only admins can delete events' });
  }

  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

  res.json({ success: true, message: 'Event deleted' });
});

const rsvpEvent = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const event = await Event.findById(req.params.id);
  
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

  if (!event.participantIds.includes(userId)) {
    event.participantIds.push(userId);
    event.rsvpCount = event.participantIds.length;
    await event.save();
    
    publish(process.env.PUBSUB_TOPIC_EVENT_RSVP || 'decp.event.rsvp', { eventId: event._id, userId });
  }

  res.json({ success: true, message: 'RSVP confirmed' });
});

const cancelRsvpEvent = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const event = await Event.findById(req.params.id);
  
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

  if (event.participantIds.includes(userId)) {
    event.participantIds = event.participantIds.filter(id => id !== userId);
    event.rsvpCount = event.participantIds.length;
    await event.save();
  }

  res.json({ success: true, message: 'RSVP cancelled' });
});

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  cancelRsvpEvent,
  eventSchema
};
