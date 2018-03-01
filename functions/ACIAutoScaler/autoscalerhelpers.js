const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
const request = require('../shared/external').request;
const config = require('./config');
const utilities = require('../shared/utilities');
const tableSvc = azurestorage.createTableService();

function getAllACICreatingOrRunning() {
    return new Promise(function (resolve, reject) {
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    const query = new azurestorage.TableQuery()
                        .select(['PartitionKey', 'RowKey', 'ActiveSessions', 'State'])
                        .where('State eq ? or State eq ?', constants.creatingState, constants.runningState)
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

function handleScaleInOut() {
    let entries;
    return new Promise(function (resolve, reject) {
        let scaleInHappened = false, scaleOutHappened = false;
        getAllACICreatingOrRunning().then(arrayEntries => {
            entries = arrayEntries;
            if (config.scaleOut) {
                scaleOutHappened = true;
                return handleScaleOut(entries);
            }
            else {
                return Promise.resolve(false);
            }
        }).then((scaleOutResult) => {
            if (scaleOutResult === false) { //no scale out occurred, let's check for scale in
                if (config.scaleIn) {
                    scaleInHappened = true;
                    return handleScaleIn(entries);
                }
                else {
                    return Promise.resolve(false);
                }
            }
        })
            .then(() => resolve(`ScaleIn: ${scaleInHappened}, ScaleOut: ${scaleOutHappened}`))
            .catch(err => reject(err));
    });
}

//promise resolves to true or false regarding to whether scale out happened
function handleScaleOut(entries) {
    return new Promise((resolve, reject) => {
        //if at least one server is 'creating', this means that it's enough to handle the incoming load
        if (entries.some(x => x.State._ === constants.creatingState)) {
            resolve(false);
        }
        else {
            const { capacity, load } = calculateLoadAndCapacity(entries);
            if (load / capacity > 0.9) {
                //load larger than 90% -> scale up by 1
                createNewACI().then(() => resolve(true)).catch((err) => reject(err));
            }
        }
    });
}

//promise resolves to true or false regarding to whether scale in happened
function handleScaleIn(entries) {
    return new Promise((resolve, reject) => {
        //get only running servers
        const running = entries.filter(x => x.State._ === constants.runningState);
        const { capacity, load } = calculateLoadAndCapacity(running);
        //more than two running servers and
        //less then 60% load
        if (running.length > 2 && load / capacity < 0.6) {
            //find the container with the less sessions            
            let lowest = Number.POSITIVE_INFINITY;
            let server;
            for (let i = running.length - 1; i >= 0; i--) {
                if (running[i].ActiveSessions._ < lowest) {
                    lowest = running[i].ActiveSessions._;
                    server = running[i];
                }
            }
            setACIState(server.PartitionKey._, server.RowKey._)
                .then(() => resolve(true))
                .catch((err) => reject(err));

        }
        else {
            resolve(false);
        }
    });
}

function setACIState(resourceGroup, containerGroupName) {
    return new Promise(function (resolve, reject) {
        const aciData = {
            resourceGroup: resourceGroup,
            containerGroupName: containerGroupName,
            state: "MarkedForDeletion"
        };

        request({
            url: process.env.ACI_SET_STATE_URL,
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
                resolve(`${JSON.stringify(aciData)}`);
            }
        });
    });
}

function createNewACI() {
    return new Promise(function (resolve, reject) {
        if (process.env.CONTAINER_GROUP_TEMPLATE) {
            const name = utilities.generateRandomString(7);
            let containerGroupString = process.env.CONTAINER_GROUP_TEMPLATE;
            containerGroupString = containerGroupString.replace('%CONTAINER_GROUP_NAME%', name)
                .replace('%CONTAINER_NAME%', name)
                .replace('%MOUNT_STORAGE_ACCOUNT_NAME%', process.env.MOUNT_STORAGE_ACCOUNT_NAME)
                .replace('%MOUNT_STORAGE_ACCOUNT_KEY%', process.env.MOUNT_STORAGE_ACCOUNT_KEY);

            const aciData = JSON.parse(containerGroupString);

            request({
                url: process.env.ACI_CREATE_URL,
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
                    resolve(`${JSON.stringify(aciData)}`);
                }
            });
        }
        else {//process.env.CONTAINER_GROUP_TEMPLATE is empty
            reject('Empty CONTAINER_GROUP_TEMPLATE env variable');
        }
    });
}

function calculateLoadAndCapacity(entries) {
    //calculate total capacity and current load of our servers
    const capacity = entries.length * config.maxPlayersPerServer;
    const load = entries.reduce((a, b) => ({ ActiveSessions: a.ActiveSessions._ + b.ActiveSessions._ }));
    return {
        capacity, load
    };
}

module.exports = {
    handleScaleInOut
};