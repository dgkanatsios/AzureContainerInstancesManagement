const constants = require('./constants');
const crypto = require('crypto');

module.exports = {
    validatePostData: function (body) {
        if (body && body.resourceGroup && body.containerGroupName)
            return true;
        else
            return false;
    },

    validateDetailsData: function (body) {
        //only 'logs' or undefined is accepted for type
        if (body && body.resourceGroup && body.containerGroupName && body.type) {
            if (body.type === 'logs' && body.containerName) {
                return true;
            }
            else {
                return false;
            }
        }
        else if (body && body.resourceGroup && body.containerGroupName)
            return true;
        else
            return false;
    },
    validateSetStateData: function (body) {
        if (body && body.resourceGroup && body.containerGroupName && body.state &&
            (body.state === constants.markedForDeletionState || body.state === constants.failedState))
            return true;
        else
            return false;
    },

    validateSetSessionsData: function (body) {
        return body && Array.isArray(body);
    },


    validateCreatePostData: function (body) {
        if (body && body.resourceGroup && body.containerGroupName && body.containerGroup && body.containerGroup.location &&
            body.containerGroup.containers && body.containerGroup.osType)
            return true;
        else
            return false;
    },

    setErrorAndCloseContext(context, errorMessage, statusCode) {
        context.log.error(`ERROR: ${errorMessage}`);
        context.res = {
            status: statusCode,
            body: errorMessage,
        };
        context.done(errorMessage);
    },

    generateRandomString(length) {
        if (length < 3 || length > 10) {
            throw new Error('string must be between 3 and 10 chars');
        }
        return crypto.randomBytes(length).toString('hex');
    }
}