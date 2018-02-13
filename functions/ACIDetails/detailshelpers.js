const MsRest = require('../shared/external').MsRest;
const ContainerInstanceManagementClient = require('../shared/external').ContainerInstanceManagementClient;
const clientId = process.env.CLIENTID;
const secret = process.env.CLIENTSECRET;
const domain = process.env.TENANT;
const subscriptionId = process.env.SUBSCRIPTIONID;

function getContainerGroupDetails(body) {
    return new Promise(function (resolve, reject) {
        MsRest.loginWithServicePrincipalSecret(
            clientId,
            secret,
            domain,
            (err, credentials) => {
                if (err) throw err;

                const client = new ContainerInstanceManagementClient(credentials, subscriptionId);

                let promise;
                //see if client asked for logs
                if (body.type && body.type === 'logs') {
                    promise = client.containerLogs.list(body.resourceGroup, body.containerGroupName);
                } else {
                    promise = client.containerGroups.get(body.resourceGroup, body.containerGroupName)
                }


                promise.then(response => {
                        resolve(response);
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
    });
}

module.exports = {
    getContainerGroupDetails
};