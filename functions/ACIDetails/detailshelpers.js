const MsRest = require('../shared/external').MsRest;
const ContainerInstanceManagementClient = require('../shared/external').ContainerInstanceManagementClient;
const subscriptionId = process.env.SUBSCRIPTIONID;

function getContainerGroupDetails(body) {
    return new Promise(function (resolve, reject) {
        MsRest.loginWithAppServiceMSI().then(credentials => {

            const client = new ContainerInstanceManagementClient(credentials, subscriptionId);

            let promise;
            //see if client asked for logs
            if (body.type && body.type === 'logs') {
                promise = client.containerLogs.list(body.resourceGroup, body.containerGroupName, body.containerName);
            } else {
                promise = client.containerGroups.get(body.resourceGroup, body.containerGroupName)
            }


            promise.then(response => {
                resolve(JSON.stringify(response));
            }).catch(err => {
                    reject(err);
                });
        }).catch(err => {
            reject(err);
        });
    });
}

module.exports = {
    getContainerGroupDetails
};