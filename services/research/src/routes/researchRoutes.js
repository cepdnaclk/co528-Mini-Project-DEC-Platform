const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/researchController');

router.get('/', ctrl.getProjects);
router.post('/', ctrl.createProject);
router.get('/:id', ctrl.getProject);
router.put('/:id', ctrl.updateProject);
router.post('/:id/join', ctrl.joinProject);
router.delete('/:id/leave', ctrl.leaveProject);

module.exports = router;
