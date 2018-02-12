const MsRest = require('ms-rest-azure');
const ContainerInstanceManagementClient = require('azure-arm-containerinstance');
const azurestorage = require('azure-storage');
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
                        State: constants.creatingState
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

                const ports = (body.ports || process.env.DOCKERPORTS).toString().split(',').map(function (x) {
                    return {
                        protocol: 'TCP',
                        port: Number(x)
                    }
                });

                const containerGroup = {
                    location: body.location,
                    containers: [{
                        name: body.containerInstanceName,
                        image: body.dockerImage || process.env.DOCKERIMAGE,
                        resources: {
                            requests: {
                                memoryInGB: body.memoryInGB || constants.defaultMemory,
                                cpu: body.cpu || constants.defaultCPU
                            }
                        },
                        ports: ports
                    }],
                    ipAddress: {
                        ports: ports,
                        type: 'Public'
                    },
                    osType: body.osType,
                };

                let client = new ContainerInstanceManagementClient(credentials, subscriptionId);

                client.containerGroups.createOrUpdate(body.resourceGroup, body.containerGroupName, containerGroup)
                    .then(response => resolve(JSON.stringify(response)))
                    .catch(err => reject(err));
            });
    });
}

module.exports = {
    createContainerGroup,
    insertIntoTable
};