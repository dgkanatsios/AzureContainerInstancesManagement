const MsRest = require('ms-rest-azure');
const ContainerInstanceManagementClient = require('azure-arm-containerinstance').ContainerInstanceManagementClient;
const azurestorage = require('azure-storage');
const request = require('requestretry');

module.exports = {
    MsRest,
    ContainerInstanceManagementClient,
    azurestorage,
    request
};