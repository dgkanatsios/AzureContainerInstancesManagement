module.exports = {
    validatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName)
            return true;
        else
            return false;
    },

    validateReportSessionsData: function(body){
        return Array.isArray(body);
    },

    //Sample create post data
    /*
     {
    resourceGroup: "acitest123",
    containerGroupName: "cigroup",
    containerGroup : {
        location: "eastus",
        containers: [{
            name: "ciname",
            image: "dgkanatsios/simpleapp", 
            resources: {
                requests: {
                    memoryInGB: 0.5,
                    cpu: 0.5
                }
            },
            ports: [{
                protocol: 'TCP',
                port: 8080
            }]
        }],
        ipAddress: {
            ports: [{
                protocol: 'TCP',
                port: 8080
            }],
            type: 'Public'
        },
        osType: 'Linux',
    }
}
    */
    validateCreatePostData: function (body) {
        if (body.resourceGroup && body.containerGroupName && body.containerGroup && body.containerGroup.location &&
            body.containerGroup.containers && body.containerGroup.osType)
            return true;
        else
            return false;
    }
}