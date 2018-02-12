module.exports = {
    validatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName)
            return true;
        else
            return false;
    },

    validateReportSessionsData: function (body) {
        return Array.isArray(body);
    },


    validateCreatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName && body.containerGroup && body.containerGroup.location &&
            body.containerGroup.containers && body.containerGroup.osType)
            return true;
        else
            return false;
    },

    setErrorAndCloseContext(context, errorMessage, statusCode){
        context.res = {
            status: statusCode,
            body: errorMessage,
        };
        context.done();
    }
}
