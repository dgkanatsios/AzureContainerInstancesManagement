const MsRest = require('../shared/external').MsRest;
const ContainerInstanceManagementClient = require('../shared/external').ContainerInstanceManagementClient;
const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
const clientId = process.env.CLIENTID;
const secret = process.env.CLIENTSECRET;
const domain = process.env.TENANT;
const subscriptionId = process.env.SUBSCRIPTIONID;

function deleteACIFromTable(body) {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    const aciData = {
                        PartitionKey: body.resourceGroup,
                        RowKey: body.containerGroupName
                    };
                    //there is a small chance that the entity will have been deleted before the following code runs
                    tableSvc.deleteEntity(tableName, aciData, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(`Deleted ID ${aciData.RowKey} and ResourceGroup ${aciData.PartitionKey}`);
                        }
                    });

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
    deleteContainerGroup,
    deleteACIFromTable
};