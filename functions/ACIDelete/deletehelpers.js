const MsRest = require('ms-rest-azure');
const ContainerInstanceManagementClient = require('azure-arm-containerinstance');
const azurestorage = require('azure-storage');
const constants = require('../shared/constants');
const tableName = constants.tableName;
const clientId = process.env.CLIENTID;
const secret = process.env.CLIENTSECRET;
const domain = process.env.TENANT;
const subscriptionId = process.env.SUBSCRIPTIONID;

function setInTableAsDeleting(body) {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    //schema definitions https://docs.microsoft.com/en-us/azure/event-grid/event-schema-subscriptions
                    const resourceGroup = body.resourceGroup;
                    const resourceId = body.containerGroupName;
                    const aciData = {
                        PartitionKey: resourceGroup,
                        RowKey: resourceId,
                        State: constants.deletingState
                    };
                    //there is a small chance that the entity will have been deleted before the following code runs
                    tableSvc.retrieveEntity(tableName, aciData.PartitionKey, aciData.RowKey, function (error, result, response) {
                        if (!error) {
                            //result contains the entity
                            tableSvc.replaceEntity(tableName, aciData, function (error, result, response) {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(`Updated Container Group with ID ${aciData.RowKey} and State ${aciData.State} on ResourceGroup ${aciData.PartitionKey}`);
                                }
                            });

                        } else { //no entity found
                            resolve(`Not set in table as Deleting for Container Group with ID ${aciData.RowKey} and State ${aciData.State} on ResourceGroup ${aciData.PartitionKey} as it does not exist on the table`);
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
    setInTableAsDeleting
};