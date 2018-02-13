const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
const ACIDeleteFunctionURL = process.env.ACIDELETEURL;
const request = require('../shared/external').request;

function getAllACIMarkedForDeletion() {
    return new Promise(function (resolve, reject) {
        const tableSvc = azurestorage.createTableService();
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    const query = new azurestorage.TableQuery()
                        .where('State eq ?', constants.markedForDeletionState)
                        .and('ActiveSessions eq ?', 0);

                    tableSvc.queryEntities(tableName, query, null, function (error, result, response) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result.entries);
                        }
                    });
                }
            });
    });
}

function deleteAllMarkedForDeletionWithZeroSessions() {
    return new Promise(function (resolve, reject) {
        getAllACIMarkedForDeletion().then(entries => {
            return Promise.all(entries.map(entry => {
                return deleteMarkedForDeletionWithZeroSessions(entry);
            }));
        }).then(() => resolve('Delete all OK')).catch(err => reject(err));
    });
}

function deleteMarkedForDeletionWithZeroSessions(entry) {
    return new Promise(function (resolve, reject) {
        request({
            url: ACIDeleteFunctionURL,
            json: true,
            method: 'POST',
            form: {
                resourceGroup: entry.PartitionKey,
                containerGroupName: entry.RowKey
            },
            maxAttempts: 5, // (default) try 5 times
            retryDelay: 5000, // (default) wait for 5s before trying again
            retryStrategy: request.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
        }, function (err, response, body) {
            // this callback will only be called when the request succeeded or after maxAttempts or on error
            if (err) {
                reject(err);
            } else if (response) {
                resolve('Delete OK');
            }
        });
    });
}

module.exports = {
    deleteAllMarkedForDeletionWithZeroSessions
};