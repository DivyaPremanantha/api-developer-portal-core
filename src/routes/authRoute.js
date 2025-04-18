/*
 * Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const registerPartials = require('../middlewares/registerPartials');

// router.get('/portal/login', registerPartials, authController.login);
// router.get('/portal/callback', authController.handleCallback);
// router.get('/portal/logout', authController.handleLogOut);
// router.get('/portal/signup', authController.handleSignUp);

router.get('/:orgName/views/:viewName/login', registerPartials, authController.login);
router.get('/:orgName/callback', authController.handleCallback);
router.get('/signin', authController.handleCallback);
router.get('/:orgName/views/:viewName/logout', authController.handleLogOut);
router.get('/:orgName/views/:viewName/signup', authController.handleSignUp);
router.get('/logout', authController.handleLogOutLanding);




module.exports = router;

