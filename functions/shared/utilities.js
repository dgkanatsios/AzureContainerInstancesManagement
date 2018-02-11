module.exports = {
    validatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName)
            return true;
        else
            return false;
    },
    validateCreatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName && body.containerInstanceName && body.location && body.osType
        && body.dockerImage)
            return true;
        else
            return false;
    }
}