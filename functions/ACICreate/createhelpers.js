const MsRest = require('../shared/external').MsRest;
const ContainerInstanceManagementClient = require('../shared/external').ContainerInstanceManagementClient;
const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
const clientId = process.env.CLIENTID;
const secret = process.env.CLIENTSECRET;
const domain = process.env.TENANT;
const subscriptionId = process.env.SUBSCRIPTIONID;

function insertIntoTable(body) {
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
                        ActiveSessions: 0,
                        ContainerName: body.containerGroup.containers[0].name,
                        State: constants.creatingState,
                        Location: body.containerGroup.location,
                        Image: body.containerGroup.containers[0].image,
                        CPU: body.containerGroup.containers[0].resources.requests.cpu,
                        RAM: body.containerGroup.containers[0].resources.requests.memoryInGB
                    };

                    //there is a chance that the ACI has been created and set to Running before the following piece of code runs
                    //so, first we'll do a check whether this is the case
                    tableSvc.retrieveEntity(tableName, aciData.PartitionKey, aciData.RowKey, function (error, result, response) {
                        if (!error) {
                            //result contains the entity
                            //leave it as is
                            resolve(`Not Inserted Container Group with ID ${aciData.RowKey} and State ${aciData.State} on ResourceGroup ${aciData.PartitionKey} as it exists with data: ${JSON.stringify(result)}`);
                        } else { //no entity found
                            tableSvc.insertEntity(tableName, aciData, function (error, result, response) {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(`Inserted Container Group with ID ${aciData.RowKey} and State ${aciData.State} on ResourceGroup ${aciData.PartitionKey}`);
                                }
                            });
                        }
                    });
                }
            });
    });
}

function createContainerGroup(body) {
    return new Promise(function (resolve, reject) {
        MsRest.loginWithServicePrincipalSecret(
            clientId,
            secret,
            domain,
            (err, credentials) => {
                if (err) throw err;

                const client = new ContainerInstanceManagementClient(credentials, subscriptionId);

                addEnvVariables(body.resourceGroup, body.containerGroupName, body.containerGroup);

                client.containerGroups.createOrUpdate(body.resourceGroup, body.containerGroupName, body.containerGroup)
                    .then(response => resolve(JSON.stringify(response)))
                    .catch(err => reject(err));
            });
    });
}

function addEnvVariables(resourceGroup, containerGroupName, containerGroup) {
    //add SET_SESSIONS_URL, RESOURCE_GROUP, CONTAINER_GROUP_NAME
    containerGroup.containers.forEach(function (container) {
        if (!(container.environmentVariables))
            container.environmentVariables = [];

        container.environmentVariables.push({
            name: 'SET_SESSIONS_URL',
            value: process.env.SET_SESSIONS_URL
        }, {
            name: 'RESOURCE_GROUP',
            value: resourceGroup
        }, {
            name: 'CONTAINER_GROUP_NAME',
            value: containerGroupName
        });
    });
}

module.exports = {
    createContainerGroup,
    insertIntoTable
};