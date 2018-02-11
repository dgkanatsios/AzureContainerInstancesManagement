module.exports = {
    validatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName)
            return true;
        else
            return false;
    },

    //Sample create post data
    // ports, memoryInGB and cpu are optional
    /*
    {
        resourceGroup: "acitest",
        containerGroupName: "cigroup",
        containerInstanceName: "ciname",
        location: "eastus",
        osType: "Linux",
        dockerImage: "dgkanatsios/simpleapp",
        ports: "8080,8081",
        memoryInGB: 0.5,
        cpu: 0.5 
    }
    */
    validateCreatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName && body.containerInstanceName && body.location && body.osType &&
            body.dockerImage)
            return true;
        else
            return false;
    }
}