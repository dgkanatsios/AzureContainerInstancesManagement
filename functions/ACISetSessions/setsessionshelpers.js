const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;


function updateSession(tableSvc, acidata) {
    return new Promise(function (resolve, reject) {
        const aciData = {
            PartitionKey: acidata.resourceGroup,
            RowKey: acidata.containerGroupName,
            ActiveSessions: Number(acidata.activeSessions)
        };
        tableSvc.mergeEntity(tableName, aciData, function (error, result, response) {
            if (error) {
                reject(error);
            } else {
                resolve(`Updated Container Group with ID ${aciData.RowKey} and ActiveSessions ${aciData.ActiveSessions} on ResourceGroup ${aciData.PartitionKey}`);
            }
        });
    });
}

function setSessions(body) {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    Promise.all(body.map(x => updateSession(tableSvc, x))).then(() => resolve('Update OK'));
                }
            });

    });
}

module.exports = {
    setSessions
};