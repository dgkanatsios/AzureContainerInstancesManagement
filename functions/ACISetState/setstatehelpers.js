const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;


function setState(body) {
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
                        State: body.state
                    };
                    tableSvc.mergeEntity(tableName, aciData, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(`Set state ${aciData.State} to Container Group with ID ${aciData.RowKey} on ResourceGroup ${aciData.PartitionKey}`);
                        }
                    });
                }
            });

    });
}

module.exports = {
    setState
};