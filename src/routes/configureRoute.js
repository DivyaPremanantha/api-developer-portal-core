const express = require('express');
const router = express.Router();
const settingsController = require('../controllers//settingsController');
const registerPartials = require('../middlewares/registerPartials');
const { ensureAuthenticated } = require('../middlewares/ensureAuthenticated');


router.get('/(((?!favicon.ico|images)):orgName/configure)', ensureAuthenticated, registerPartials, settingsController.loadSettingPage);

router.get('/(((?!favicon.ico|images))portal)', registerPartials, ensureAuthenticated, settingsController.loadPortalPage);

router.get('/(((?!favicon.ico|images))portal/:orgId/edit)', registerPartials, ensureAuthenticated, settingsController.loadEditOrganizationPage);

router.get('/(((?!favicon.ico|images))portal/create)', registerPartials, ensureAuthenticated, settingsController.loadCreateOrganizationPage);

module.exports = router;
