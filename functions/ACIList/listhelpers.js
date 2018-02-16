const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;

function listRunningACIs(body) {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    const query = new azurestorage.TableQuery()
                        .where('State eq ?', constants.runningState);
                    tableSvc.queryEntities(tableName, query, null, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result.entries.map(entry => {

                                let sessions = 0;
                                if(entry.ActiveSessions){
                                    sessions = entry.ActiveSessions._;
                                }
                                
                                return {
                                    resourceGroup: entry.PartitionKey._, 
                                    containerGroupName: entry.RowKey._,
                                    PublicIP: entry.PublicIP._,
                                    ActiveSessions: sessions 
                                }
                            }));
                        }
                    });

                }
            });
    });
}

module.exports = {
    listRunningACIs
};