const MsRest = require('../shared/external').MsRest;
const ContainerInstanceManagementClient = require('../shared/external').ContainerInstanceManagementClient;
const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
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
        MsRest.loginWithAppServiceMSI().then(credentials => {

            let client = new ContainerInstanceManagementClient(credentials, subscriptionId);

            client.containerGroups.deleteMethod(body.resourceGroup, body.containerGroupName)
                .then(response => {
                    resolve(JSON.stringify(response));
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
    deleteContainerGroup,
    deleteACIFromTable
};