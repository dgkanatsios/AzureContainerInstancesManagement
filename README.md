[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![unofficial Google Analytics for GitHub](https://gaforgithub.azurewebsites.net/api?repo=AzureContainerInstancesManagement)](https://github.com/dgkanatsios/gaforgithub)
![](https://img.shields.io/badge/status-beta-orange.svg)

# AzureContainerInstancesManagement

Manage Azure Container Instances using Azure Functions. We suppose that there is an external service that manages running instances (Container Groups) and schedules sessions on them. `Sessions` could be anything that has a fixed lifetime, like multiplayer game sessions.

## Inspiration
This project was heavily inspired by a similar project that deals with VMs called [AzureGameRoomsScaler](https://github.com/PoisonousJohn/AzureGameRoomsScaler).

## One-click deployment

Click the following button to deploy in your Azure subscription:

<a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fdgkanatsios%2FAzureContainerInstancesManagement%2Fmaster%2Fdeploy.json" target="_blank"><img src="http://azuredeploy.net/deploybutton.png"/></a>

As soon as the deployment completes, you need to manually add the Event Subscription webhook manually using the instructions [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#create-a-subscription).

## Demo
We've created a couple of demos so that you can test the service, check the details on [DEMOS.md](DEMOS.md)

## Technical details

This project allows you to manage [Azure Container Instances](https://azure.microsoft.com/en-us/services/container-instances/) using [Azure Functions](https://azure.microsoft.com/en-us/services/functions/). It contains 8 functions:

- **ACICreate**: Creates a new Azure Container Group
- **ACIDelete**: Deletes a Container Group
- **ACIDetails**: Gets details/logs for a Container Group/Container
- **ACIGC**: [Timer triggered](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer), runs every 5', deletes all Container Groups that have no running sessions and have been marked as 'MarkedForDeletion'
- **ACIList**: Returns the details (IP/ number of active sessions) about 'Running' Container Groups
- **ACIMonitor**: Responds to Event Grid events which occur when a Container Instance resource is created/deleted/changed
- **ACISetSessions**: Sets the running sessions for each Container Group
- **ACISetState**: Sets the state of the Container Group (2 options are 'MarkedForDeletion' and 'Failed')

These functions are supposed to be called by an external service (for a game, this would be the matchmaking service).

Azure Container Groups that are created can be in one of the below states:

- **Creating**: Container group has just been created
- **Running**: Docker image pulled, public IP (if available) ready, can accept connections/sessions
- **MarkedForDeletion**: We can mark a Container Group as `MarkedForDeletion` so that it will be deleted when a) there are no more active sessions and b) the **ACIGC** Function runs
- **Failed**: When something has gone bad

## Flow

A typical flow of the app goes like this:

1. External service calls `ACICreate`, so a new Container Group is created and is set to `Creating` state
2. As soon as the Event Grid notification comes to `ACIMonitor` function, this means that the Container Group is ready so the `ACIMonitor` function inserts its public IP into Table Storage
3. External service can call `ACIList` to get Container Groups in `Running` state as well as `ACIDetails` to get logs/details about the Container Group
4. External service or the Docker containers themselves can call `ACISetSessions` to set running sessions count on Table Storage
5. External Service can call `ACISetState` to set Container Group’s state as `MarkedForDeletion` when the Container Group is no longer needed
6. Time triggered `ACIGC` (GC: Garbage Collector) will remove unwanted Container Groups (i.e. Container Groups that have 0 active/running sesions and are `MarkedForDeletion`)

![alt text](media/states.jpg "States and Transition")

## FAQ

#### What is this **.deployment** file at the root of the project?
This guides the [Kudu](https://github.com/projectkudu/kudu) engine as to where the source code for the Functions is located, in the GitHub repo. Check [here](https://github.com/projectkudu/kudu/wiki/Customizing-deployments) for details.

#### Why are there 4 ARM templates instead of one?
Indeed, there 4 4 ARM files on the project. They are executed in the following order:
- **deploy.json**: The master template that deploys the other 3
- **deploy.function.json**: Deploys the Azure Function App that contains the Functions of our project
- **deploy.function.config.json**: As we need to set an environment variable that gets the value of our 'ACISetSessions' Function trigger URL, we need to set up this template that executes *after* the deployment of the Azure Function App has completed.
- **deploy.eventgridsubscription.json**: Again, we need to get the Event Grid webhook/URL so we manually run this *after* the deployment of the Azure Function App has completed (and the URL has been internally created).

#### I want to handle more events from Azure Event Grid. Where is the definition of those events?
Check [here](https://docs.microsoft.com/en-us/azure/event-grid/event-schema-resource-groups) for resource group events and [here](https://docs.microsoft.com/en-us/azure/event-grid/event-schema-subscriptions) for subscription-wide events.

#### How can I troubleshoot my Azure Container Instances?
As always, Azure documentation is your friend, check [here](https://docs.microsoft.com/en-us/azure/container-instances/container-instances-troubleshooting).

#### How can I manage Keys for my Functions?
Check [here](https://github.com/Azure/azure-functions-host/wiki/Key-management-API).

#### How can I test the Functions?
Not direct Function testing on this project (yet), however you can see a testing file on `tests\index.js`. To run it, you need to setup an `tests\.env` file with the following variables properly set:

- SUBSCRIPTIONID = ''
- CLIENTID = ''
- CLIENTSECRET = ''
- TENANT = ''
- AZURE_STORAGE_ACCOUNT = ''
- AZURE_STORAGE_ACCESS_KEY = ''

#### How can I monitor Event Grid message delivery?
Check [here](https://docs.microsoft.com/en-us/azure/event-grid/monitor-event-delivery) on Azure Event Grid documentation.

#### What's the exat format of the container groups ARM Template (or, what kind of JSON can I send to ACICreate)?
Check [here](https://docs.microsoft.com/en-us/azure/templates/microsoft.containerinstance/containergroups) for the ARM Template for Container Groups.