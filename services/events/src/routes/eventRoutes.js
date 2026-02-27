const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const validate = require('../middlewares/validate');
const internalAuth = require('../middlewares/internalAuth');

router.post('/', validate(eventController.eventSchema), eventController.createEvent);
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEvent);
router.put('/:id', validate(eventController.eventSchema), eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

router.post('/:id/rsvp', eventController.rsvpEvent);
router.delete('/:id/rsvp', eventController.cancelRsvpEvent);

module.exports = router;
