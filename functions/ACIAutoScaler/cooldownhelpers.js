const azurestorage = require('../shared/external').azurestorage;
const constants = require('../shared/constants');
const tableName = constants.tableName;
const config = require('./config');
const tableSvc = azurestorage.createTableService();

//this method checks if the cooldown period has passed, since the latest scale in or scale out process
function cooldownPeriodHasPassed(context) {
    return new Promise((resolve, reject) => {
        const blobService = azurestorage.createBlobService(process.env.AZURE_STORAGE_ACCOUNT,
            process.env.AZURE_STORAGE_ACCESS_KEY);
        blobService.createContainerIfNotExists(helpers.containerName, function (error, result, response) {
            if (!error) {
                blobService.getBlobProperties(
                    containerName,
                    blobName,
                    function (err, properties, status) {
                        if (status.isSuccessful) {
                            context.log("Blob exists");
                            // Blob exists
                            //check if the time difference between the latest scale in/out happened  
                            //and now is more than the threshold
                            blobService.getBlobToText(config.containerName, config.blob, function (error, result) {
                                if (!error) {
                                    result = JSON.parse(result);
                                    context.log("Last scale in/out was at " + result);
                                    const lastScalingDate = new Date(result.lastScalingDate);
                                    if (new Date() - lastScalingDate >= 5 * 60 * 1000) {
                                        resolve(true);
                                    }
                                    else {
                                        resolve(false);
                                    }
                                } else {
                                    reject({
                                        message: error
                                    });
                                }
                            });
                        } else {
                            // Blob doesn't exist, so we never had any scale in or scale out
                            resolve(true);
                        }
                    });
            } else { //error in creating container
                reject({
                    message: error
                });
            }
        });
    });
}

function updateLatestScaleInOut() {
    return new Promise((resolve, reject) => {
        const blobService = azurestorage.createBlobService(process.env.AZURE_STORAGE_ACCOUNT,
            process.env.AZURE_STORAGE_ACCESS_KEY);
        blobService.createContainerIfNotExists(helpers.containerName, function (error, result, response) {
            if (!error) {
                // if result = true, blob container was created.
                // if result = false, blob container already existed.
                const body = JSON.stringify({
                    lastScalingDate: new Date()
                });
                blobService.createBlockBlobFromText(config.containerName, config.blob, body, function (error, result, response) {
                    if (!error) {
                        resolve({
                            message: 'Upload OK!'
                        });
                    } else { //error in creating blockblob
                        reject({
                            message: error
                        });
                    }
                });
            } else { //error in creating container
                reject({
                    message: error
                });
            }
        });
    });
}

module.exports = {
    cooldownPeriodHasPassed,
    updateLatestScaleInOut
};