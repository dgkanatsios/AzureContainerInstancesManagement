const createhelpers = require('./createhelpers');
const utilities = require('../shared/utilities');

module.exports = function (context, req) {
    if (utilities.validateCreatePostData(req.body)) {
        createhelpers.createContainerGroup(req.body).then(() => createhelpers.insertIntoTable(req.body))
            .then(() => {
                context.res = {
                    body: 'Create OK'
                };
                context.done();
            })
            .catch(error => {
                utilities.setErrorAndCloseContext(context, error, 500);
            });
    } else {
        utilities.setErrorAndCloseContext(context, `Incorrect POST Data, try something like ${JSON.stringify(samplePostData)}`, 400);
    }
};


//Sample create POST data
let samplePostData = {
    resourceGroup: "acitest123",
    containerGroupName: "cigroup",
    containerGroup: {
        location: "eastus",
        containers: [{
            name: "ciname",
            image: "dgkanatsios/simpleapp",
            environmentVariables: [],
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
        osType: 'Linux'
    }
}