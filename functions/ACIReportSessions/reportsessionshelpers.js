const azurestorage = require('azure-storage');
const constants = require('../shared/constants');
// const MsRest = require('ms-rest-azure');
 const tableName = constants.tableName;
// const clientId = process.env.CLIENTID;
// const secret = process.env.CLIENTSECRET;
// const domain = process.env.TENANT;
// const subscriptionId = process.env.SUBSCRIPTIONID;



function updateSession(tableSvc, acidata) {
    return new Promise(function (resolve, reject) {
        const aciData = {
            PartitionKey: acidata.resourceGroup,
            RowKey: acidata.containerGroupName,
            ActiveSessions: acidata.activeSessions
        };
        tableSvc.mergeEntity(tableName, aciData, function (error, result, response) {
            if (error) {
                reject(error);
            } else {
                resolve(`Updated Container Group with ID ${aciData.RowKey} and ActiveSessions ${aciData.ActiveSessions} on ResourceGroup ${aciData.PartitionKey}`);
            }
        });
    });
}

//ACI Data is like
/*
const acidata = [{
    resourceGroup: '',
    containerGroupName: '',
    activeSessions: 5
}];
*/

function setSessions(body) {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    Promise.all(body.map(x => updateSession(tableSvc, x))).then(() => resolve('Update OK'));
                }
            });

    });
}

function deleteContainerGroup(body) {
    return new Promise(function (resolve, reject) {
        MsRest.loginWithServicePrincipalSecret(
            clientId,
            secret,
            domain,
            (err, credentials) => {
                if (err) throw err;

                let client = new ContainerInstanceManagementClient(credentials, subscriptionId);

                client.containerGroups.deleteMethod(body.resourceGroup, body.containerGroupName)
                    .then(response => {
                        resolve(JSON.stringify(response));
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
    });
}

module.exports = {
    setSessions
};