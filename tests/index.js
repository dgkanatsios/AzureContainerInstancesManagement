require('dotenv').config();
const ContainerInstanceManagementClient = require('azure-arm-containerinstance');
const WebSiteManagementClient = require('azure-arm-website');


const utilities = require('../functions/shared/utilities');

const deletehelpers = require('../functions/ACIDelete/deletehelpers');
const createhelpers = require('../functions/ACICreate/createhelpers');
const setsessionshelpers = require('../functions/ACIsetSessions/setsessionshelpers');
const monitorhelpers = require('../functions/ACIMonitor/monitorhelpers');
const detailshelpers = require('../functions/ACIDetails/detailshelpers');
const setstatehelpers = require('../functions/ACISetState/setstatehelpers');
const garbagecollectionhelpers = require('../functions/ACIGC/garbagecollectionhelpers');

function queryAppService(resourceGroup, credentials, subscriptionId) {
    let webSiteClient = new WebSiteManagementClient(credentials, subscriptionId);
    webSiteClient.webApps.listFunctionSecrets(resourceGroup, 'aci123', 'ACICreate').then(result => {
        console.log(result)
    }).catch(error => console.log(JSON.stringify(error)));

}


function listContainerGroups(credentials) {
    let client = new ContainerInstanceManagementClient(credentials, subscriptionId);
    client.containerGroups.list().then((containerGroups) => {
        console.log('List of containerGroups:');
        console.dir(containerGroups, {
            depth: null,
            colors: true
        });
    });
}


let body = {
    resourceGroup: "acitest123",
    containerGroupName: "cigroup",
    containerGroup: {
        location: "eastus",
        containers: [{
            name: "ciname",
            image: "dgkanatsios/simpleapp",
            resources: {
                requests: {
                    memoryInGB: 0.5,
                    cpu: 1
                }
            },
            ports: [{
                protocol: 'TCP',
                port: 80
            }]
        }],
        ipAddress: {
            ports: [{
                protocol: 'TCP',
                port: 80
            }],
            type: 'Public'
        },
        osType: 'Linux'
    }
};

let deleteBody = {
    resourceGroup: "acitest123",
    containerGroupName: "cigroup"
};

const sessions = [{
    resourceGroup: 'acitest123',
    containerGroupName: 'cigroup',
    activeSessions: 5
}];

const detailsBody = {
    resourceGroup: "acitest123",
    containerGroupName: "cigroup2",
    type: "logs",
    containerName: "ciname"
};

const setStateBody = {
    resourceGroup: "acitest123",
    containerGroupName: "cigroup2",
    state: "MarkedForDeletion"
};

if (utilities.validatePostData(body)) {

    //createACI(body);
    //getDetails(detailsBody);
    //setState(setStateBody);
    runGC();
    //monitorhelpers.getPublicIP(body.resourceGroup, body.containerGroupName).then((ip) => console.log(ip)).catch(err => console.log(err)).then(() => console.log("IP GET OK"));
    //setsessionshelpers.setSessions(sessions).catch(err => console.log(err)).then(() => console.log('Sessions update OK'));
    //deletehelpers.deleteContainerGroup(deleteBody).then(() => deletehelpers.deleteACIFromTable(deleteBody)).catch(error => console.log(error)).then(() => console.log('Done'));
}

function setState(body) {
    if (utilities.validateSetStateData(body)) {
        setstatehelpers.setState(body).then(res => console.log(res)).catch(err => console.log(err));
    } else {
        console.log('invalid post data');
    }
}

function getDetails(body) {
    if (utilities.validatePostData) {
        detailshelpers.getContainerGroupDetails(body).then(res => console.log(res)).catch(err => console.log(err));
    } else {
        console.log('invalid post data');
    }
}

function createACI(body) {
    if (utilities.validateCreatePostData) {
        createhelpers.createContainerGroup(body).then(() => createhelpers.insertIntoTable(body)).catch(error => console.log(error)).then(() => console.log('done'));
    } else {
        console.log('invalid post data');
    }
}

function runGC() {
    //remember to set process.env.ACI_DELETE_URL properly
    garbagecollectionhelpers.deleteAllMarkedForDeletionWithZeroSessions().then((res) => console.log(res)).catch(err=>console.log(err));
}