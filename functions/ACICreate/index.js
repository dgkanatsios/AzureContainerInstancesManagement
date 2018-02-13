const createhelpers = require('./createhelpers');
const utilities = require('../shared/utilities');

module.exports = function (context, req) {
    if (utilities.validateCreatePostData(req.body)) {
        createhelpers.createContainerGroup(req.body).then(() => createhelpers.insertIntoTable(req.body))
            .then((res) => {
                context.res = {
                    body: res
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
const samplePostData = {
    resourceGroup: "acitest123",
    containerGroupName: "cigroup",
    containerGroup: {
        location: "eastus",
        containers: [{
            name: "ciname",
            image: "dgkanatsios/simpleapp",
            environmentVariables: [{
                name:'envName',
                value:'envValue'
            }],
            resources: {
                requests: {
                    memoryInGB: 0.5,
                    cpu: 0.5
                }
            },
            ports: [{
                protocol: 'TCP',
                port: 80
            }]
        }],
        ipAddress: {
            ports: [{
                protocol: 'TCP',
                port: 80
            }],
            type: 'Public'
        },
        osType: 'Linux'
    }
}