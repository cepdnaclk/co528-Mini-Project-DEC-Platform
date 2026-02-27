const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const validate = require('../middlewares/validate');
const internalAuth = require('../middlewares/internalAuth');

router.post('/', validate(jobController.jobSchema), jobController.createJob);
router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJob);
router.put('/:id', validate(jobController.jobSchema), jobController.updateJob);
router.delete('/:id', jobController.deleteJob);

router.post('/:id/apply', validate(jobController.applySchema), jobController.applyJob);
router.get('/:id/applications', jobController.getApplications);

module.exports = router;
