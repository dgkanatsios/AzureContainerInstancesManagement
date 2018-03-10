const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
const request = require('../shared/external').request;
const config = require('./config');
const utilities = require('../shared/utilities');
const tableSvc = azurestorage.createTableService();
const cooldownhelpers = require('./cooldownhelpers');

const scaleOutThreshold = process.env.AUTOSCALER_SCALE_OUT_THRESHOLD || 0.8;
const scaleInThreshold = process.env.AUTOSCALER_SCALE_IN_THRESHOLD || 0.6;
const minimumInstances = process.env.AUTOSCALER_MINIMUM_INSTANCES || 1;
const maximumInstances = process.env.AUTOSCALER_MAXIMUM_INSTANCES || 10;

function getAllACICreatingOrRunning(context) {
    return new Promise(function (resolve, reject) {
        tableSvc.createTableIfNotExists(tableName,
            function (error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    const query = new azurestorage.TableQuery()
                        .select(['PartitionKey', 'RowKey', 'ActiveSessions', 'State'])
                        .where('State eq ? or State eq ?', constants.creatingState, constants.runningState);

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

function handleScaleInOut(context) {
    let entries;
    return new Promise(function (resolve, reject) {

        let scaleInHappened = false,
            scaleOutHappened = false;

        //check if the cooldown period has passed since the last scale in/out process
        cooldownhelpers.cooldownPeriodHasPassed(context).then(result => {
            if (result) {//cooldown period has passed
                getAllACICreatingOrRunning(context).then(arrayEntries => {
                    entries = arrayEntries;
                    if (config.scaleOut) {
                        return handleScaleOut(context, entries);
                    } else {
                        return Promise.resolve(false);
                    }
                }).then((scaleOutResult) => {
                    scaleOutHappened = scaleOutResult;
                    if (scaleOutResult === false) { //no scale out occurred, let's check for scale in
                        if (config.scaleIn) {
                            return handleScaleIn(context, entries);
                        } else {
                            return Promise.resolve(false);
                        }
                    } else {
                        return Promise.resolve(false); //scale out occured, so no scale in
                    }
                }).then((scaleInResult) => {
                    scaleInHappened = scaleInResult;
                    if (scaleInHappened || scaleOutHappened) {
                        return cooldownhelpers.updateLatestScaleInOut();
                    }
                    else {
                        Promise.resolve();
                    }
                }).then(() => {
                    resolve(`ScaleIn: ${scaleInHappened}, ScaleOut: ${scaleOutHappened}`);
                })
                    .catch(err => reject(err));
            }
            else {
                resolve(`Cooldown period has not passed, ScaleIn: ${scaleInHappened}, ScaleOut: ${scaleOutHappened}`);
            }
        }).catch(err => reject(err));
    });
}

//promise resolves to true or false regarding to whether scale out happened
function handleScaleOut(context, entries) {
    return new Promise((resolve, reject) => {
        //if at least one server is 'creating', this means that it's enough to handle the incoming load
        if (entries.some(x => x.State._ === constants.creatingState)) {
            resolve(false);
        } else {
            const {
                capacity,
                load
            } = calculateLoadAndCapacity(context, entries);
            const running = entries.filter(x => x.State._ === constants.runningState);
            //context.log(capacity + ' ' + load);
            if ((entries.length === 0) ||
                (running.length < maximumInstances && load / capacity > scaleOutThreshold)) {
                //load larger than 80% -> scale out by 1
                createNewACI().then(() => resolve(true)).catch((err) => reject(err));
            } else {
                resolve(false);
            }
        }
    });
}

//promise resolves to true or false regarding to whether scale in happened
function handleScaleIn(context, entries) {
    return new Promise((resolve, reject) => {
        //get only running servers
        const running = entries.filter(x => x.State._ === constants.runningState);
        const {
            capacity,
            load
        } = calculateLoadAndCapacity(context, running);
        //more than two running servers and
        //less then 60% load
        if (running.length > minimumInstances && load / capacity < scaleInThreshold) {
            //find the container with the fewest sessions            
            let lowest = Number.POSITIVE_INFINITY;
            let server;
            for (let i = running.length - 1; i >= 0; i--) {
                if (running[i].ActiveSessions._ < lowest) {
                    lowest = running[i].ActiveSessions._;
                    server = running[i];
                }
            }

            setACIStateAsMarkedForDeletion(server.PartitionKey._, server.RowKey._)
                .then(() => resolve(true))
                .catch((err) => reject(err));

        } else {
            resolve(false);
        }
    });
}

function setACIStateAsMarkedForDeletion(resourceGroup, containerGroupName) {
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

            const aciData = JSON.parse(process.env.CONTAINER_GROUP_TEMPLATE);

            const randomName = utilities.generateRandomString(5);

            //set a random name for the container/container group
            aciData.containerGroupName += randomName;
            aciData.containerGroup.containers[0].name += randomName;

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
        } else { //process.env.CONTAINER_GROUP_TEMPLATE is empty
            reject('Empty CONTAINER_GROUP_TEMPLATE env variable');
        }
    });
}

function calculateLoadAndCapacity(context, entries) {
    //calculate total capacity and current load of our servers
    const capacity = entries.length * config.maxPlayersPerServer;
    const load = entries.map(el => el.ActiveSessions._).reduce((a, b) => a + b, 0);

    return {
        capacity,
        load: load
    };
}

module.exports = {
    handleScaleInOut
};