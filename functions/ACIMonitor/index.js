const azurestorage = require('azure-storage');
const constants = require('../shared/constants');

//remember that process.env.AZURE_STORAGE_ACCOUNT and process.env.AZURE_STORAGE_ACCESS_KEY must be set with the correct values

const resourceGroupPattern = '\/resource[Gg]roups\/(.*?)\/';
const resourceIdPattern = '\/container[Gg]roups\/(.*?)$';

const tableName = constants.tableName;

function modifyTable(context, data) {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    //schema definitions https://docs.microsoft.com/en-us/azure/event-grid/event-schema-subscriptions
                    const resourceGroup = data.resourceUri.match(resourceGroupPattern)[1];
                    const resourceId = data.resourceUri.match(resourceIdPattern)[1];
                    const aciData = {
                        PartitionKey: resourceGroup,
                        RowKey: resourceId,
                        Status: data.status
                    };
                    if (data.status === 'Succeeded') {
                        if (data.operationName === 'Microsoft.ContainerInstance/containerGroups/delete') {
                            tableSvc.deleteEntity(tableName, aciData, function (error, result, response) {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(`Deleted ResourceGroup ${aciData.PartitionKey} and ID ${aciData.RowKey}`);
                                }
                            });
                        } else {
                            tableSvc.replaceEntity(tableName, aciData, function (error, result, response) {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(`Inserted ResourceGroup ${aciData.PartitionKey} and ID ${aciData.RowKey} and Status ${aciData.Status}`);
                                }
                            });
                        }
                    } else if (data.status === 'Failed') {
                        tableSvc.replaceEntity(tableName, aciData, function (error, result, response) {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(`Inserted/Updated ResourceGroup ${aciData.PartitionKey} and ID ${aciData.RowKey} and Status ${aciData.Status}`);
                            }
                        });
                    }
                }
            });
    });
}


module.exports = function (context, eventGridEvent) {
    context.log(eventGridEvent);
    if (eventGridEvent.data.resourceProvider === 'Microsoft.ContainerInstance') {
        modifyTable(context, eventGridEvent.data).then(result => {
            context.log(result);
        }).catch(error => {
            context.log(error);
        }).finally(() => {
            context.done();
        });
    } else {
        context.done();
    }
};