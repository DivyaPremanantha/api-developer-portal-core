/*
 * Copyright (c) 2024, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
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
/* eslint-disable no-undef */
const { CustomError } = require('../utils/errors/customErrors');
const adminDao = require('../dao/admin');
const apiDao = require('../dao/apiMetadata');
const util = require('../utils/util');
const fs = require('fs');
const path = require('path');
const IdentityProviderDTO = require("../dto/identityProvider");
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const sequelize = require("../db/sequelize");
const config = require(process.cwd() + '/config.json');

const createOrganization = async (req, res) => {

    const rules = util.validateOrganization();
    for (let validation of rules) {
        await validation.run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
                return res.status(400).json(util.getErrors(errors));
    }
    const payload = req.body;
    let organization = "";
    try {
        await sequelize.transaction(async (t) => {
            organization = await adminDao.createOrganization(payload, t);
            const orgId = organization.ORG_ID;
            // create default label
            const labels = await apiDao.createLabels(organization.ORG_ID, [{ name: 'default' , displayName: 'default'}], t);
            const labelId = labels[0].dataValues.LABEL_ID;
            //create default view
            const viewResponse = await apiDao.addView(orgId, {name: 'default', displayName: 'default'}, t);
            const viewID = viewResponse.dataValues.VIEW_ID;
            await apiDao.addLabel(orgId, labelId, viewID, t);
            //create default provider
            await adminDao.createProvider(organization.ORG_ID, { name: 'WSO2', providerURL: config.controlPlane.url}, t);
        });
        const orgCreationResponse = {
            orgId: organization.ORG_ID,
            orgName: organization.ORG_NAME,
            businessOwner: organization.BUSINESS_OWNER,
            businessOwnerContact: organization.BUSINESS_OWNER_CONTACT,
            businessOwnerEmail: organization.BUSINESS_OWNER_EMAIL,
            orgHandle: organization.ORG_HANDLE,
            roleClaimName: organization.ROLE_CLAIM_NAME,
            groupsClaimName: organization.GROUPS_CLAIM_NAME,
            organizationClaimName: organization.ORGANIZATION_CLAIM_NAME,
            organizationIdentifier: organization.ORGANIZATION_IDENTIFIER,
            adminRole: organization.ADMIN_ROLE,
            subscriberRole: organization.SUBSCRIBER_ROLE,
            groupClaimName: organization.GROUP_CLAIM_NAME
        };
        res.status(201).send(orgCreationResponse);
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.ORG_CREATE_ERROR}`, error);
        util.handleError(res, error);
    }
};

const getOrganizations = async (req, res) => {

    try {
        const orgList = await getAllOrganizations();
        res.status(200).send(orgList);
    } catch (error) {
        util.handleError(res, error);
    }
};

const getAllOrganizations = async () => {

    const organizations = await adminDao.getOrganizations();
    const orgList = [];
    if (organizations.length > 0) {
        for (const organization of organizations) {
            orgList.push({
                orgName: organization.dataValues.ORG_NAME,
                orgID: organization.dataValues.ORG_ID,
                businessOwner: organization.dataValues.BUSINESS_OWNER,
                businessOwnerContact: organization.dataValues.BUSINESS_OWNER_CONTACT,
                businessOwnerEmail: organization.dataValues.BUSINESS_OWNER_EMAIL,
                orgHandle: organization.ORG_HANDLE,
                roleClaimName: organization.ROLE_CLAIM_NAME,
                groupsClaimName: organization.GROUPS_CLAIM_NAME,
                organizationClaimName: organization.ORGANIZATION_CLAIM_NAME,
                organizationIdentifier: organization.ORGANIZATION_IDENTIFIER,
                adminRole: organization.ADMIN_ROLE,
                subscriberRole: organization.SUBSCRIBER_ROLE,
                superAdminRole: organization.SUPER_ADMIN_ROLE
            });
        }
    }
    return orgList;
}

const updateOrganization = async (req, res) => {

    try {
        const orgId = req.params.orgId;
        if (!orgId) {
            console.log("Missing required parameter: 'orgId'");
            throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
        }
        const rules = util.validateOrganization();

        for (let validation of rules) {
            await validation.run(req);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(util.getErrors(errors));
        }
        const payload = req.body;
        payload.orgId = orgId;
        const [, updatedOrg] = await adminDao.updateOrganization(payload);
        res.status(200).json({
            orgId: updatedOrg[0].dataValues.ORG_ID,
            orgName: updatedOrg[0].dataValues.ORG_NAME,
            businessOwner: updatedOrg[0].dataValues.BUSINESS_OWNER,
            businessOwnerContact: updatedOrg[0].dataValues.BUSINESS_OWNER_CONTACT,
            businessOwnerEmail: updatedOrg[0].dataValues.BUSINESS_OWNER_EMAIL,
            orgHandle: updatedOrg[0].dataValues.ORG_HANDLE,
            roleClaimName: updatedOrg[0].dataValues.ROLE_CLAIM_NAME,
            groupsClaimName: updatedOrg[0].dataValues.GROUPS_CLAIM_NAME,
            organizationClaimName: updatedOrg[0].dataValues.ORGANIZATION_CLAIM_NAME,
            organizationIdentifier: updatedOrg[0].dataValues.ORGANIZATION_IDENTIFIER,
            adminRole: updatedOrg[0].dataValues.ADMIN_ROLE,
            subscriberRole: updatedOrg[0].dataValues.SUBSCRIBER_ROLE,
            superAdminRole: updatedOrg[0].dataValues.SUPER_ADMIN_ROLE
        });
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.ORG_UPDATE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
};

const deleteOrganization = async (req, res) => {

    try {
        const orgId = req.params.orgId;
        if (!orgId) {
            throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
        }
        const deletedRowsCount = await adminDao.deleteOrganization(orgId);
        if (deletedRowsCount > 0) {
            res.status(204).send();
        } else {
            throw new CustomError(404, "Records Not Found", 'Organization not found');
        }
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.ORG_DELETE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
};

const createIdentityProvider = async (req, res) => {

    try {
        const idpData = req.body;
        const orgId = req.params.orgId;
        if (!orgId) {
            throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
        }
        const rules = util.validateIDP();
        for (let validation of rules) {        
            await validation.run(req);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(util.getErrors(errors));
            return res.status(400).json(util.getErrors(errors));
        }
        const idpResponse = await adminDao.createIdentityProvider(orgId, idpData);
        res.status(201).send(new IdentityProviderDTO(idpResponse.dataValues));
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.IDP_CREATE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
};

const updateIdentityProvider = async (req, res) => {

    try {
        const orgId = req.params.orgId;
        const idpData = req.body;
        if (!orgId) {
            throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
        }
        const rules = util.validateIDP();
        for (let validation of rules) {
            await validation.run(req);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(util.getErrors(errors));
        }
        const [updatedRows, updatedIDP] = await adminDao.updateIdentityProvider(orgId, idpData);
        if (!updatedRows) {
            throw new Sequelize.EmptyResultError("No record found to update");
        }
        res.status(200).send(new IdentityProviderDTO(updatedIDP[0].dataValues));
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.IDP_UPDATE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
};

const getIdentityProvider = async (req, res) => {

    const orgID = req.params.orgId;
    if (!orgID) {
        throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
    }
    try {
        const retrievedIDP = await adminDao.getIdentityProvider(orgID);
        // Create response object
        if (retrievedIDP.length > 0) {
            res.status(200).send(new IdentityProviderDTO(retrievedIDP[0]));
        } else {
            res.status(404).send();
        }
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.IDP_NOT_FOUND}, ${error}`);
        util.handleError(res, error);
    }
}

const deleteIdentityProvider = async (req, res) => {

    const orgID = req.params.orgId;
    if (!orgID) {
        throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
    }
    try {
        const idpDeleteResponse = await adminDao.deleteIdentityProvider(orgID);
        if (idpDeleteResponse === 0) {
            throw new Sequelize.EmptyResultError("Resource not found to delete");
        } else {
            res.status(200).send("Resouce Deleted Successfully");
        }
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.IDP_DELETE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
};

const createOrgContent = async (req, res) => {

    const orgId = req.params.orgId;
    const viewName = req.params.name;
    const zipPath = req.file.path;
    const extractPath = path.join(process.cwd(), '..', '.tmp', orgId);
    await util.unzipFile(zipPath, extractPath);
    try {
        const files = await util.readFilesInDirectory(extractPath, orgId, req.protocol, req.get('host'), viewName);
        for (const { filePath, fileName, fileContent, fileType } of files) {
            await createContent(filePath, fileName, fileContent, fileType, orgId, viewName);
        }
        res.status(201).send({ "orgId": orgId, "fileName": req.file.originalname });
        fs.rmSync(extractPath, { recursive: true, force: true });

    } catch (error) {
        console.log(`${constants.ERROR_MESSAGE.ORG_CONTENT_CREATE_ERROR}, ${error}`);
        fs.rmSync(extractPath, { recursive: true, force: true });
        return util.handleError(res, error);
    }
};

const createContent = async (filePath, fileName, fileContent, fileType, orgId, viewName) => {

    let content;
    // eslint-disable-next-line no-useless-catch
    try {
        if (fileName != null && !fileName.startsWith('.')) {
            content = await adminDao.createOrgContent({
                fileType: fileType,
                fileName: fileName,
                fileContent: fileContent,
                filePath: filePath,
                orgId: orgId,
                viewName: viewName
            });
        }
    } catch (error) {
        throw error;
    }
    return content;
};

const updateOrgContent = async (req, res) => {

    const orgId = req.params.orgId;
    const viewName = req.params.name;
    const zipPath = req.file.path;
    const extractPath = path.join(process.cwd(), '..', '.tmp', orgId);
    await util.unzipFile(zipPath, extractPath);
    const files = await util.readFilesInDirectory(extractPath, orgId, req.protocol, req.get('host'), viewName);
    try {
        for (const { filePath, fileName, fileContent, fileType } of files) {
            if (fileName != null && !fileName.startsWith('.')) {
                const organizationContent = await getOrgContent(orgId, viewName, fileType, fileName, filePath);
                if (organizationContent) {
                    await adminDao.updateOrgContent({
                        fileType: fileType,
                        fileName: fileName,
                        fileContent: fileContent,
                        filePath: filePath,
                        orgId: orgId,
                        viewName: viewName
                    });
                } else {
                    console.log("Update Content not exists, hense creating new content");
                    await createContent(filePath, fileName, fileContent, fileType, orgId, viewName);
                }
            }
        }
        fs.rmSync(extractPath, { recursive: true, force: true });
        res.status(201).send({ "orgId": orgId, "fileName": req.file.originalname });
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.ORG_CONTENT_UPDATE_ERROR}`, error);
        fs.rmSync(extractPath, { recursive: true, force: true });
        util.handleError(res, error);
    }
};

const getOrgContent = async (orgId, viewName, fileType, fileName, filePath) => {

    return await adminDao.getOrgContent({
        orgId: orgId,
        viewName: viewName,
        fileType: fileType,
        fileName: fileName,
        filePath: filePath
    });
};

const deleteOrgContent = async (req, res) => {

    try {
        const fileName = req.query.fileName;
        if (!req.query.fileName) {
            throw new CustomError(400, "Bad Request", "Missing required parameter: 'fileName'");
        }
        const deletedRowsCount = await adminDao.deleteOrgContent(req.params.orgId, req.params.name, fileName);
        if (deletedRowsCount > 0) {
            res.status(204).send();
        } else {
            throw new CustomError(404, "Records Not Found", 'Organization not found');
        }
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.ORG_CONTENT_DELETE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
};



const createProvider = async (req, res) => {

    const orgID = req.params.orgId;
    const payload = req.body;
    const rules = util.validateProvider();

    for (let validation of rules) {
        await validation.run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(util.getErrors(errors));
    }
    const extraKeys = util.rejectExtraProperties(['name', 'providerURL'], payload)
    if (extraKeys.length > 0) {
        return res.status(400).json(new CustomError(400, "Bad Request", `Unexpected properties: ${extraKeys.join(', ')}`));
    }
    try {
        const provider = await adminDao.createProvider(orgID, payload);
        let providerData = {
            orgId: provider[0].dataValues.ORG_ID,
            name: provider[0].dataValues.NAME,
        };
        for (const prop of provider) {
            providerData[prop.dataValues.PROPERTY] = prop.dataValues.VALUE;
        }
        res.status(201).send(providerData);
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.PROVIDER_CREATE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
}

const updateProvider = async (req, res) => {

    try {
        const orgId = req.params.orgId;
        const payload = req.body;
        if (!orgId) {
            console.log("Missing required parameter: 'orgId'");
            throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
        }
        const rules = util.validateProvider();

        for (let validation of rules) {
            await validation.run(req);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(util.getErrors(errors));
        }
        const extraKeys = util.rejectExtraProperties(['name', 'providerURL'], payload)
        if (extraKeys.length > 0) {
            return res.status(400).json(new CustomError(400, "Bad Request", `Unexpected properties: ${extraKeys.join(', ')}`));
        }
        const provider = await adminDao.updateProvider(orgId, payload);
        let providerData = {
            orgId: provider[0][0].dataValues.ORG_ID,
            name: provider[0][0].dataValues.NAME,
        };
        for (const prop of provider) {
            providerData[prop[0].dataValues.PROPERTY] = prop[0].dataValues.VALUE;
        }
        res.status(200).json(providerData);
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.PROVIDER_UPDATE_ERROR}, ${error}`);
        util.handleError(res, error);
    }

}

const getProviders = async (req, res) => {

    try {
        const orgID = req.params.orgId;
        if (req.query.name) {
            const providerName = req.query.name;
            return res.status(200).send(await getProvidetByName(orgID, providerName));
        } else {
            const providerList = await getAllProviders(orgID);
            return res.status(200).send(providerList);
        }
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.PROVIDER_FETCH_ERROR}, ${error}`);
        util.handleError(res, error);
    }
}

const getProvidetByName = async (orgID, name) => {

    const providerData = await adminDao.getProvider(orgID, name);
    if (providerData.length > 0) {
        const providerResponse = {
            name: providerData[0].dataValues.NAME,
        };
        for (const provider of providerData) {
            providerResponse[provider.dataValues.PROPERTY] = provider.dataValues.VALUE;
        }
        return providerResponse;
    }

}

const getAllProviders = async (orgID) => {

    const providers = await adminDao.getProviders(orgID);
    const providerList = [];
    if (providers.length > 0) {
        for (const provider of providers) {
            const providerData = {
                name: provider.dataValues.NAME,
            };
            for (const [key, value] of Object.entries(provider.dataValues.properties)) {
                providerData[key] = value;
            }
            providerList.push(providerData);
        }
    }
    return providerList;
}

const deleteProvider = async (req, res) => {

    try {
        const orgId = req.params.orgId;
        const providerName = req.query.name;
        let property, deletedRowsCount;
        if (req.query.property) {
            property = req.query.property;
            deletedRowsCount = await adminDao.deleteProviderProperty(orgId, property, providerName);
        } else {
            deletedRowsCount = await adminDao.deleteProvider(orgId, providerName);
        }
        if (!orgId || !providerName) {
            throw new CustomError(400, "Bad Request", "Missing required parameter: 'orgId'");
        }
        if (deletedRowsCount > 0) {
            res.status(204).send();
        } else {
            throw new CustomError(404, "Records Not Found", 'Provider property not found');
        }
    } catch (error) {
        console.error(`${constants.ERROR_MESSAGE.PROVIDER_DELETE_ERROR}, ${error}`);
        util.handleError(res, error);
    }
}

module.exports = {
    createOrganization,
    updateOrganization,
    deleteOrganization,
    createOrgContent,
    updateOrgContent,
    getOrgContent,
    deleteOrgContent,
    createIdentityProvider,
    updateIdentityProvider,
    getIdentityProvider,
    deleteIdentityProvider,
    getOrganizations,
    getAllOrganizations,
    createProvider,
    updateProvider,
    getProviders,
    getAllProviders,
    deleteProvider,
    getProvidetByName
};
