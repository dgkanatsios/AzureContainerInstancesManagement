const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
const ACIDeleteFunctionURL = process.env.ACIDELETEURL;
const request = require('../shared/external').request;

const tableSvc = azurestorage.createTableService();

function getAllACIMarkedForDeletion() {
    return new Promise(function (resolve, reject) {
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
                return deleteSingleMarkedForDeletionWithZeroSessions(entry);
            }));
        }).then(() => resolve('Delete all OK')).catch(err => reject(err));
    });
}

function deleteSingleMarkedForDeletionWithZeroSessions(entry) {
    return new Promise(function (resolve, reject) {
        const aciData = {
            resourceGroup: entry.PartitionKey._, //yup, _ gives the value (...)
            containerGroupName: entry.RowKey._ 
        };
        request({
            url: process.env.ACIDeleteFunctionURL,
            json: aciData,
            method: 'POST',
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