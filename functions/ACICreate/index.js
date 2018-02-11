const azurestorage = require('azure-storage');
const constants = require('../shared/constants');
const utilities = require('../shared/utilities');
const MsRest = require('ms-rest-azure');
const ContainerInstanceManagementClient = require('azure-arm-containerinstance');

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

                    tableSvc.insertEntity(tableName, aciData, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(`Inserted Container Group with ID ${aciData.RowKey} and State ${aciData.State} on ResourceGroup ${aciData.PartitionKey} and `);
                        }
                    });

                }
            });
    });
}

function createContainerGroup(body) {
    return new Promise(function(resolve,reject) {
    MsRest.loginWithServicePrincipalSecret(
        clientId,
        secret,
        domain,
        (err, credentials) => {
            if (err) throw err;

            const ports = (body.ports || process.env.DOCKERPORTS).split(',').map(function (x) {
                return {
                    protocol: 'TCP',
                    port: x
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
                osType: body.osType,
            };

            let client = new ContainerInstanceManagementClient(credentials, subscriptionId);

            client.containerGroups.createOrUpdate(body.resourceGroup, body.containerGroupName, containerGroup)
                .then(response => resolve(JSON.stringify(response)))
                .catch(err => reject(err));
        });
    });
}



module.exports = function (context, req) {
    if (utilities.validatePostData(req.body)) {
        insertIntoTable(req.body).then(() => createContainerGroup(req.body)).catch(error => context.error(error)).finally(()=>context.done());
    } else {
        context.done();
    }
};