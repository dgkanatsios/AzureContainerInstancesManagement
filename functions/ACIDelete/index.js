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

                    tableSvc.replaceEntity(tableName, aciData, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(`Updated Container Group with ID ${aciData.RowKey} and State ${aciData.State} on ResourceGroup ${aciData.PartitionKey}`);
                        }
                    });

                }
            });
    });
}

function deleteContainerGroup(body, callback) {
    MsRest.loginWithServicePrincipalSecret(
        clientId,
        secret,
        domain,
        (err, credentials) => {
            if (err) throw err;

            let client = new ContainerInstanceManagementClient(credentials, subscriptionId);

            client.containerGroups.deleteMethod(body.resourceGroup, body.containerGroupName)
                .then(response => {
                    console.log(JSON.stringify(response));
                    callback(null, response);
                })
                .catch(err => {
                    console.log(err);
                    callback(err, null);
                });
        });
}

module.exports = function (context, req) {
    if (utilities.validatePostData(req.body)) {
        deleteFromTable(req.body).then(() => {
            deleteContainerGroup(req.body)
        }).catch(error => context.error(error)).finally(() => context.done());
    } else {
        context.done();
    }

};