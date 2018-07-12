const MsRest = require('../shared/external').MsRest;
const ContainerInstanceManagementClient = require('../shared/external').ContainerInstanceManagementClient;
const subscriptionId = process.env.SUBSCRIPTIONID;

function getPublicIP(resourceGroup, containerGroupName) {
    return new Promise(function (resolve, reject) {
        MsRest.loginWithAppServiceMSI().then(credentials => {

            const client = new ContainerInstanceManagementClient(credentials, subscriptionId);

            client.containerGroups.get(resourceGroup, containerGroupName)
                .then(response => {
                    resolve(response.ipAddress.ip);
                })
                .catch(err => {
                    reject(err);
                });
        }).catch(err => {
            reject(err);
        });
    });
}

module.exports = {
    getPublicIP
};