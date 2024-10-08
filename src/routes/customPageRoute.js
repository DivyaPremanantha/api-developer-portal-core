const express = require('express');
const router = express.Router();
const contentController = require('../controllers/customContentController');

router.get('/((?!favicon.ico|images|styles):orgName/*)', contentController.loadCustomContent);

module.exports = router;