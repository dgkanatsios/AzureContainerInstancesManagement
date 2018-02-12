const azurestorage = require('azure-storage');
const constants = require('../shared/constants');
const tableName = constants.tableName;


function setStateAsMarkedForDeletion(body) {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    const aciData = {
                        PartitionKey: body.resourceGroup,
                        RowKey: body.containerGroupName,
                        State: constants.markedForDeletionState
                    };
                    tableSvc.mergeEntity(tableName, aciData, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(`Marked for deletion Container Group with ID ${aciData.RowKey} on ResourceGroup ${aciData.PartitionKey}`);
                        }
                    });
                }
            });

    });
}

module.exports = {
    setStateAsMarkedForDeletion
};