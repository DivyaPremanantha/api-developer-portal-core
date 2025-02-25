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
const { Organization, OrgContent } = require('../models/organization');
const { Sequelize } = require('sequelize');
const { IdentityProvider } = require('../models/identityProvider');
const { Application, ApplicationKeyMapping, SubscriptionMapping } = require('../models/application');
const Provider = require('../models/provider');
const apiDao = require('./apiMetadata');

const createOrganization = async (orgData, t) => {

    let devPortalID = "";
    if (orgData.orgHandle) {
        devPortalID = orgData.orgHandle
    }
    const createOrgData = {
        ORG_NAME: orgData.orgName,
        BUSINESS_OWNER: orgData.businessOwner,
        BUSINESS_OWNER_CONTACT: orgData.businessOwnerContact,
        BUSINESS_OWNER_EMAIL: orgData.businessOwnerEmail,
        ORG_HANDLE: devPortalID,
        ROLE_CLAIM_NAME: orgData.roleClaimName,
        GROUPS_CLAIM_NAME: orgData.groupsClaimName,
        ORGANIZATION_CLAIM_NAME: orgData.organizationClaimName,
        ORGANIZATION_IDENTIFIER: orgData.organizationIdentifier,
        ADMIN_ROLE: orgData.adminRole,
        SUBSCRIBER_ROLE: orgData.subscriberRole,
        SUPER_ADMIN_ROLE: orgData.superAdminRole
    };
    try {
        const organization = await Organization.create(createOrgData, { transaction: t });
        return organization;
    } catch (error) {
        console.log(error)
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const getOrganization = async (param) => {

    try {
        const organization = await Organization.findOne({
            where: {
                [Sequelize.Op.or]: [
                    { ORG_NAME: param },
                    { ORG_HANDLE: param },
                    { ORG_ID: param }
                ]
            }
        });
        if (!organization) {
            throw new Sequelize.EmptyResultError('Organization not found');
        }
        return organization;
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const getOrgId = async (orgName) => {
    try {
        const organization = await Organization.findOne({
            where: {
                [Sequelize.Op.or]: [
                    { ORG_NAME: orgName },
                    { ORG_HANDLE: orgName }
                ]
            }
        });
        if (!organization) {
            throw new Sequelize.EmptyResultError('Organization not found');
        }
        return organization.ORG_ID;
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const getOrganizations = async () => {

    try {
        const organizations = await Organization.findAll();
        if (organizations.length === 0) {
            return [];
        }
        return organizations;
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const updateOrganization = async (orgData) => {

    let devPortalID = "";
    if (orgData.orgHandle) {
        devPortalID = orgData.orgHandle
    }
    try {
        const [updatedRowsCount, updatedOrg] = await Organization.update(
            {
                ORG_NAME: orgData.orgName,
                BUSINESS_OWNER: orgData.businessOwner,
                BUSINESS_OWNER_CONTACT: orgData.businessOwnerContact,
                BUSINESS_OWNER_EMAIL: orgData.businessOwnerEmail,
                ORG_HANDLE: devPortalID,
                ROLE_CLAIM_NAME: orgData.roleClaimName,
                GROUPS_CLAIM_NAME: orgData.groupsClaimName,
                ORGANIZATION_CLAIM_NAME: orgData.organizationClaimName,
                ORGANIZATION_IDENTIFIER: orgData.organizationIdentifier,
                ADMIN_ROLE: orgData.adminRole,
                SUBSCRIBER_ROLE: orgData.subscriberRole,
                SUPER_ADMIN_ROLE: orgData.superAdminRole
            },
            {
                where: { ORG_ID: orgData.orgId },
                returning: true
            }
        );
        if (updatedRowsCount < 1) {
            throw new Sequelize.EmptyResultError('Organization not found');
        }
        return [updatedRowsCount, updatedOrg];

    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const deleteOrganization = async (orgId) => {

    try {
        const deletedRowsCount = await Organization.destroy({
            where: { ORG_ID: orgId }
        });
        if (deletedRowsCount < 1) {
            throw Object.assign(new Sequelize.EmptyResultError('Organization not found'));
        } else {
            return deletedRowsCount;
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const createIdentityProvider = async (orgId, idpData) => {

    try {
        const idpResponse = await IdentityProvider.create({
            ORG_ID: orgId,
            ISSUER: idpData.issuer,
            NAME: idpData.name,
            AUTHORIZATION_URL: idpData.authorizationURL,
            TOKEN_URL: idpData.tokenURL,
            ...(idpData.userInfoURL && { USER_INFOR_URL: idpData.userInfoURL }),
            CLIENT_ID: idpData.clientId,
            CALLBACK_URL: idpData.callbackURL,
            ...(idpData.signUpURL && { SIGNUP_URL: idpData.signUpURL }),
            LOGOUT_URL: idpData.logoutURL,
            LOGOUT_REDIRECT_URL: idpData.logoutRedirectURI,
            ...(idpData.scope && { SCOPE: idpData.scope }),
            ...(idpData.jwksURL && { JWKS_URL: idpData.jwksURL }),
            ...(idpData.certificate && { CERTIFICATE: idpData.certificate })
        });
        return idpResponse;
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const updateIdentityProvider = async (orgID, idpData) => {

    try {
        const [updatedRowsCount, idpContent] = await IdentityProvider.update(
            {
                ORG_ID: idpData.orgId,
                ISSUER: idpData.issuer,
                NAME: idpData.name,
                AUTHORIZATION_URL: idpData.authorizationURL,
                TOKEN_URL: idpData.tokenURL,
                ...(idpData.userInfoURL && { USER_INFOR_URL: idpData.userInfoURL }),
                CLIENT_ID: idpData.clientId,
                CALLBACK_URL: idpData.callbackURL,
                ...(idpData.signUpURL && { SIGNUP_URL: idpData.signUpURL }),
                LOGOUT_URL: idpData.logoutURL,
                LOGOUT_REDIRECT_URI: idpData.logoutRedirectURI,
                SCOPE: idpData.scope,
                ...(idpData.jwksURL && { JWKS_URL: idpData.jwksURL }),
                ...(idpData.certificate && { CERTIFICATE: idpData.certificate })
            },
            {
                where: {
                    ORG_ID: orgID
                },
                returning: true
            }
        );
        if (updatedRowsCount < 1) {
            throw new Sequelize.EmptyResultError('IdentityProvider not found');
        }
        return [updatedRowsCount, idpContent];

    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const getIdentityProvider = async (orgID) => {

    try {
        const idpResponse = await IdentityProvider.findAll({
            where: {
                ORG_ID: orgID,
            }
        }
        );
        return idpResponse;
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const deleteIdentityProvider = async (orgID) => {

    try {
        const idpResponse = await IdentityProvider.destroy({
            where: {
                ORG_ID: orgID
            }
        });
        return idpResponse;
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const createOrgContent = async (orgData) => {

    const viewID = await apiDao.getViewID(orgData.orgId, orgData.viewName);
    try {
        const orgContent = await OrgContent.create({
            FILE_TYPE: orgData.fileType,
            FILE_NAME: orgData.fileName,
            FILE_CONTENT: orgData.fileContent,
            FILE_PATH: orgData.filePath,
            ORG_ID: orgData.orgId,
            VIEW_ID: viewID
        });
        return orgContent;
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const updateOrgContent = async (orgData) => {

    const viewID = await apiDao.getViewID(orgData.orgId, orgData.viewName);
    try {
        const [updatedRowsCount, updatedOrgContent] = await OrgContent.update({
            FILE_TYPE: orgData.fileType,
            FILE_NAME: orgData.fileName,
            FILE_CONTENT: orgData.fileContent,
            FILE_PATH: orgData.filePath,
        },
            {
                where: {
                    FILE_TYPE: orgData.fileType,
                    FILE_NAME: orgData.fileName,
                    FILE_PATH: orgData.filePath,
                    ORG_ID: orgData.orgId,
                    VIEW_ID: viewID
                },
                returning: true
            });
        if (updatedRowsCount < 1) {
            throw new Sequelize.EmptyResultError('No new resources found');
        }
        return [updatedRowsCount, updatedOrgContent];

    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}



const getOrgContent = async (orgData) => {

    try {
        const viewID = await apiDao.getViewID(orgData.orgId, orgData.viewName);
        if (orgData.fileName || orgData.filePath) {
            return await OrgContent.findOne(
                {
                    where: {
                        ORG_ID: orgData.orgId,
                        VIEW_ID: viewID,
                        FILE_TYPE: orgData.fileType,
                        ...(orgData.fileName && { FILE_NAME: orgData.fileName }),
                        ...(orgData.filePath && { FILE_PATH: orgData.filePath })
                    }
                });
        } else {
            return await OrgContent.findAll(
                {
                    where: {
                        ORG_ID: orgData.orgId,
                        VIEW_ID: viewID,
                        FILE_TYPE: orgData.fileType,
                    }
                });
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const deleteOrgContent = async (orgId, viewName, fileName) => {

    const viewId = await apiDao.getViewID(orgId, viewName);
    try {
        const deletedRowsCount = await OrgContent.destroy({
            where: {
                ORG_ID: orgId,
                VIEW_ID: viewId,
                FILE_NAME: fileName
            }
        });

        if (deletedRowsCount < 1) {
            throw Object.assign(new Sequelize.EmptyResultError('Organization content not found'));
        } else {
            return deletedRowsCount;
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const createProvider = async (orgID, provider, t) => {

    let providerDataList = [];
    for (const [key, value] of Object.entries(provider)) {
        if (key !== 'name') {
            const providerData = {
                ORG_ID: orgID,
                NAME: provider.name,
                PROPERTY: key,
                VALUE: value
            };
            providerDataList.push(providerData);
        }
    }
    try {
        const provider = await Provider.bulkCreate(providerDataList, { transaction: t });
        return provider;
    } catch (error) {
        console.log(error)
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const updateProvider = async (orgID, provider) => {

    try {
        let updatedProviders = [];
        for (const [key, value] of Object.entries(provider)) {
            if (key !== 'name') {
                const [updatedRowsCount, providerContent] = await Provider.update(
                    {
                        VALUE: value
                    },
                    {
                        where: {
                            ORG_ID: orgID,
                            PROPERTY: key,
                            NAME: provider.name
                        },
                        returning: true
                    }
                );
                updatedProviders.push(providerContent)
                if (updatedRowsCount < 1) {
                    throw new Sequelize.EmptyResultError('API Provider not found');
                }
            }
        }
        return updatedProviders;
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const deleteProviderProperty = async (orgID, property, name) => {

    try {
        const deletedRowsCount = await Provider.destroy({
            where: {
                ORG_ID: orgID,
                PROPERTY: property,
                NAME: name
            }
        });
        if (deletedRowsCount < 1) {
            throw Object.assign(new Sequelize.EmptyResultError('Organization not found'));
        } else {
            return deletedRowsCount;
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const deleteProvider = async (orgID, name) => {

    try {
        const deletedRowsCount = await Provider.destroy({
            where: {
                ORG_ID: orgID,
                NAME: name
            }
        });
        if (deletedRowsCount < 1) {
            throw Object.assign(new Sequelize.EmptyResultError('Organization not found'));
        } else {
            return deletedRowsCount;
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const getProviders = async (orgID) => {

    try {
        const providers = await Provider.findAll(
            {
                attributes: [
                    'NAME',
                    [
                        Sequelize.fn(
                            'JSON_OBJECT_AGG',
                            Sequelize.col('PROPERTY'),
                            Sequelize.col('VALUE')
                        ),
                        'properties'
                    ]
                ],
                where: { ORG_ID: orgID },
                group: ['NAME']
            }
        );
        if (providers.length === 0) {
            return [];
        }
        return providers;
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const getProvider = async (orgID, name) => {

    try {
        return await Provider.findAll(
            {
                where: {
                    ORG_ID: orgID,
                    NAME: name
                }
            });
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const createApplication = async (orgID, userID, appData) => {

    const createAppData = {
        NAME: appData.name,
        ORG_ID: orgID,
        DESCRIPTION: appData.description,
        TYPE: appData.type,
        CREATED_BY: userID
    };
    try {
        const application = await Application.create(createAppData);
        return application;
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const updateApplication = async (orgID, appID, userID, appData) => {

    try {
        const [updatedRowsCount, appContent] = await Application.update(
            {
                NAME: appData.appName,
                DESCRIPTION: appData.description,
                TYPE: appData.type
            },
            {
                where: {
                    ORG_ID: orgID,
                    APP_ID: appID,
                    CREATED_BY: userID
                },
                returning: true
            }
        );
        return [updatedRowsCount, appContent];
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const getApplication = async (orgID, appID, userID) => {

    try {
        return await Application.findOne(
            {
                where: {
                    ORG_ID: orgID,
                    APP_ID: appID,
                    CREATED_BY: userID
                }
            });
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const getApplications = async (orgID, userID) => {

    try {
        return await Application.findAll(
            {
                where: {
                    ORG_ID: orgID,
                    CREATED_BY: userID
                }
            });
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const deleteApplication = async (orgID, appID, userID) => {

    try {
        const deletedRowsCount = await Application.destroy({
            where: {
                ORG_ID: orgID,
                APP_ID: appID,
                CREATED_BY: userID
            }
        });
        if (deletedRowsCount < 1) {
            throw Object.assign(new Sequelize.EmptyResultError('Application not found'));
        } else {
            return deletedRowsCount;
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const createSubscription = async (orgID, subscription) => {

    try {
        const subMapping = await SubscriptionMapping.create({
            APP_ID: subscription.applicationID,
            REFERENCE_ID: subscription.apiId,
            POLICY_ID: subscription.policyId,
            ORG_ID: orgID,
        });
        return subMapping;
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
};

const getSubscription = async (orgID, subID, t) => {

    try {
        return await SubscriptionMapping.findOne(
            {
                where: {
                    ORG_ID: orgID,
                    SUB_ID: subID
                }, transaction: t
            });
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const getSubscriptions = async (orgID, appID, apiID) => {

    try {
        return await SubscriptionMapping.findAll(
            {
                where: {
                    ORG_ID: orgID,
                    [Sequelize.Op.or]: [
                        { APP_ID: appID },
                        { REFERENCE_ID: apiID }
                    ]
                }
            });
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const getAppApiSubscription = async (orgID, appID, apiID) => {

    try {
        return await SubscriptionMapping.findAll(
            {
                where: {
                    ORG_ID: orgID,
                    APP_ID: appID,
                    REFERENCE_ID: apiID
                }
            });
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const deleteSubscription = async (orgID, subID, t) => {

    try {
        const deletedRowsCount = await SubscriptionMapping.destroy({
            where: {
                ORG_ID: orgID,
                SUB_ID: subID
            }, transaction: t
        },);
        if (deletedRowsCount < 1) {
            throw new Sequelize.EmptyResultError('Subscription not found');
        } else {
            return deletedRowsCount;
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const deleteAppKeyMapping = async (orgID, appID, apiID, t) => {

    try {
        const deletedRowsCount = await ApplicationKeyMapping.destroy({
            where: {
                ORG_ID: orgID,
                APP_ID: appID,
                API_REF_ID: apiID
            }, transaction: t
        });
        if (deletedRowsCount < 1) {
            throw Object.assign(new Sequelize.EmptyResultError('Application Key Mapping not found'));
        } else {
            return deletedRowsCount;
        }
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

const getAPISubscriptionReference = async (orgID, appID, apiID, t) => {

    try {
        const subscriptionReference =  await ApplicationKeyMapping.findAll(
            {
                attributes: ['SUBSCRIPTION_REF_ID'],
                where: {
                    ORG_ID: orgID,
                    APP_ID: appID,
                    API_REF_ID: apiID
                }
            }, { transaction: t });
            return subscriptionReference;
    } catch (error) {
        if (error instanceof Sequelize.EmptyResultError) {
            throw error;
        }
        throw new Sequelize.DatabaseError(error);
    }
}

module.exports = {
    createOrganization,
    getOrganization,
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
    getOrgId,
    getOrganizations,
    createProvider,
    deleteProviderProperty,
    deleteProvider,
    updateProvider,
    getProviders,
    getProvider,
    createApplication,
    updateApplication,
    getApplication,
    getApplications,
    deleteApplication,
    createSubscription,
    getSubscription,
    getSubscriptions,
    deleteSubscription,
    deleteAppKeyMapping,
    getAPISubscriptionReference,
    getAppApiSubscription
};
