const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/researchController');

router.get('/', ctrl.getProjects);
router.post('/', ctrl.createProject);
router.get('/:id', ctrl.getProject);
router.post('/:id/join', ctrl.joinProject);

module.exports = router;
