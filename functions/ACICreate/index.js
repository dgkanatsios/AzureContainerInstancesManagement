const azurestorage = require('azure-storage');
const constants = require('../shared/constants');
const MsRest = require('ms-rest-azure');
const ContainerInstanceManagementClient = require('azure-arm-containerinstance');

const tableName = constants.tableName;
const clientId = process.env.CLIENTID;
const secret = process.env.SECRET;
const domain = process.env.DOMAIN;
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
                        Status: constants.creatingState
                    };

                    tableSvc.insertEntity(tableName, aciData, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(`Inserted ResourceGroup ${aciData.PartitionKey} and ID ${aciData.RowKey} and Status ${aciData.Status}`);
                        }
                    });

                }
            });
    });
}

function createContainerGroup(body) {

    MsRest.loginWithServicePrincipalSecret(
        clientId,
        secret,
        domain,
        (err, credentials) => {
            if (err) throw err;

            const containerGroup = {
                location: "eastus",
                containers: [{
                    name: "nginxname",
                    image: "zembutsu/docker-sample-nginx",
                    resources: {
                        requests: {
                            memoryInGB: 0.5,
                            cpu: 0.5
                        }
                    }
                }],
                osType: 'Linux',
                // ipAddress: {
                //     ports: [{
                //         protocol: 'TCP',
                //         port: 80
                //     }],
                //     type: 'Public'
                // }
            };

            let client = new ContainerInstanceManagementClient(credentials, subscriptionId);

            client.containerGroups.createOrUpdate(body.resourceGroup, body.containerGroupName, containerGroup)
                .then(response => console.log(JSON.stringify(response)))
                .catch(err => console.log(err));
        });
}

function validatePostData(body) {
    return true;
}

module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (validatePostData(req.body)) {
        insertIntoTable(req.body).then
    }

};