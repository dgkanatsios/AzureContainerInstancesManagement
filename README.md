[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![unofficial Google Analytics for GitHub](https://gaforgithub.azurewebsites.net/api?repo=AzureContainerInstancesManagement)](https://github.com/dgkanatsios/gaforgithub)
![](https://img.shields.io/badge/status-beta-orange.svg)

# AzureContainerInstancesManagement

This project allows you to manage Docker containers running on [Azure Container Instances](https://azure.microsoft.com/en-us/services/container-instances/).
Suppose that you want to manage a series of running Docker containers. These containers may be stateful, so classic scaling methods (via Load Balancers etc.) would not work. A classic example is multiplayer game servers, where its server has its own connections to game clients, its own state etc. Another example would be batch-style projects, where each instance would have to deal with a separate set of data. For these kind of purposes, you would need a set of Docker containers being created on demand and deleted when their job is done and they are no longer needed in order to save costs.

## High level overview

Project contains some Functions/webhooks that can be called to create/delete/get logs from Azure Container Instances (called `ACICreate`,`ACIDelete`,`ACIDetails` respectively). There is a Function, called `ACISetSessions`, which can be used to set/report running/active sessions for each container. These sessions could be game server sessions or just 'remaining work to do'. When we create a new container, it takes some time for it to be created. When it's done and the container is running successfully, our project is notified via an [Event Grid](https://azure.microsoft.com/en-us/services/event-grid/) message. This message is posted to the `ACIMonitor` method, whose sole purpose is to listen to this messages and act appropriately. There is also a Function (`ACIList`) that retrieves a list of the running containers, the number of their active jobs/sessions as well as their Public IPs. This can be used to see the load of the running containers.

There is also a Function (`ACISetState`) that enables the caller to set the state of a container. This can be used to 'smoothly delete' a running container. Imagine this, at some point in time, we might want to delete a container (probably the existing ones can handle the incoming load). However, we do not want to disrupt existing jobs/sessions running on this particular container, so we do it call this Function to set its state as 'MarkedForDeletion'. Moreover, there is another Function (`ACIGC`) that is called on regular time intervals whose job is to delete containers that are 'MarkedForDeletion' and have no running jobs/sessions on them. To delete them, it calls the `ACIDelete` Function.

Finally, we suppose that there is an external service that uses our Functions to manage running Docker containers and schedule sessions on them.

## Inspiration
This project was heavily inspired by a similar project that deals with a similar issue but uses Azure VMs called [AzureGameRoomsScaler](https://github.com/PoisonousJohn/AzureGameRoomsScaler).

## One-click deployment

Click the following button to deploy the project to your Azure subscription:

<a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fdgkanatsios%2FAzureContainerInstancesManagement%2Fmaster%2Fdeploy.json" target="_blank"><img src="http://azuredeploy.net/deploybutton.png"/></a>

This operation will trigger a template deployment of the [deploy.json](deploy.json) ARM template file to your Azure subscription, which will create the necessary Azure resources as well as pull the source code from this repository. 

You need to specify the following information in order to deploy the project:
- *Location*: select the Azure Region where your resources will be deployed. [Make sure to select a location that Azure Container Instances are available](https://docs.microsoft.com/en-us/azure/container-instances/container-instances-quotas#region-availability).
- *Function Name*: select a unique name for your Function App. This will determine your Function's DNS, so choose wisely.
- *Client ID and Client Secret: before you deploy, you need to create an Azure Service Principal. This is an identity that has permissions to create/delete/modify Azure Resources (in this case, the Container Instances). Check [here](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal) for instructions on how to create a Service Principal in the Azure Portal. Use the Service Principal's ID and secret on the template deployment.
- *Repo URL*: this determines the repo that contains the files which will be pulled to create the Azure Functions. You can leave the default or switch it with your own fork.

The Functions are deployed on a Free [App Service Plan](https://docs.microsoft.com/lt-lt/azure/azure-functions/functions-scale#app-service-plan), you may need to scale it up for increased performance.

As soon as the deployment completes, you need to manually add the Event Subscription webhook for the `ACIMonitor` Function manually using the instructions [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#create-a-subscription). As soon as you get the URL of the `ACIMonitor` Function, you can use [this](deploy.eventgridsubscription.json) ARM template to deploy the Event Grid subscription. Just make sure that you select the correct Resource Group to monitor for events (i.e. the Azure Resource Group where your containers will be created).

## Demo

We've created a couple of demos so that you can test the project, check the detailed documentation at the [DEMOS.md](DEMOS.md) file.

## Technical details

This project allows you to manage [Azure Container Instances](https://azure.microsoft.com/en-us/services/container-instances/) using [Azure Functions](https://azure.microsoft.com/en-us/services/functions/) and [Event Grid](https://azure.microsoft.com/en-us/services/event-grid/). All operations deal with [Container Groups](https://docs.microsoft.com/en-us/azure/container-instances/container-instances-container-groups), which are the top-level resource in Azure Container Instances. Each Container Group can have X number of containers, a public IP etc. Most Functions are HTTP-triggered unless otherwise noted. Moreover, HTTP-triggered Functions are protected by ['authorization keys'](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook#authorization-keys). 

- **ACICreate**: Creates a new Azure Container Group. Details (container image, volume mounts, resource group, container and container group names) are passed via the POST request.
- **ACIDelete**: Deletes a Container Group with the specified name at the specified Resource Group (details are again passed in the POST body).
- **ACIDetails**: Gets details or logs (depending on a POST parameter) for a Container Group/Container.
- **ACIGC**: [Timer triggered](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer), runs every 5' by default, deletes all Container Groups that have no running sessions (zero) and have explicitly been marked as 'MarkedForDeletion'.
- **ACIList**: Returns the details (Public IP/number of active sessions) of all 'Running' Container Groups
- **ACIMonitor**: [EventGrid triggered](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid), it responds to Event Grid events which occur when a Container Instance resource is created/deleted/changed/failed in the specified Resource Group. This Resource Group is designated when the Event Grid subscription is created (check the [deploy.eventgridsubscription.json](deploy.eventgridsubscription.json)) file.
- **ACISetSessions**: Sets the number of active/running sessions for each Container Group. Caller can send number of sessions for one or more Container Groups. This way, this method can be called by the external service (it will report active sessions for all containers) or by each container itself (it will report active sessions for itself only).
- **ACISetState**: Sets the state of the specified Container Group. The only allowed options are 'MarkedForDeletion' and 'Failed'.

As mentioned before, the HTTP-triggered Functions are supposed to be called by an external service (for a game, this would be the matchmaking service). The details of all containers are saved in an [Azure Table Storage](https://azure.microsoft.com/en-us/services/storage/tables/) table. For each container, there is a row that holds data regarding its name (specifically, the container group name), the Resource Group it belongs to, its Public IP Address, its active sessions and its state.

In this table, Azure Container Groups can hold one of the below states:

- **Creating**: Container group has just been created, necessary resources are provisioned, DOcker image is being pulled
- **Running**: Docker image pulled, public IP (if available) ready, can accept connections/sessions
- **MarkedForDeletion**: We can mark a Container Group as `MarkedForDeletion` so that it will be deleted when a) there are no more active sessions and b) the **ACIGC** Function runs
- **Failed**: When something has gone bad

## Flow

A typical flow of the project goes like this:

1. External service calls `ACICreate`, so a new Container Group is created and is set to `Creating` state in the table.
2. As soon as the Event Grid notification comes to `ACIMonitor` function, this means that the Container Group is ready. The `ACIMonitor` function inserts its public IP into Table Storage and sets its state to `Running`.
3. External service can call `ACIList` to get info about Container Groups in `Running` state. The service can use this information to determine current system load and schedule new sessions accordingly.
4. Moreover, an operator can calll the `ACIDetails` Function to get logs/debug a running Container or get details about the Container Group.
5. External service or the Docker containers themselves can call `ACISetSessions` to set running sessions count on Table Storage.
6. External Service can call `ACISetState` to set Container Group’s state as `MarkedForDeletion` when the Container Group is no longer needed
7. The time triggered `ACIGC` (GC: Garbage Collector) will delete unwanted Container Groups (i.e. Container Groups that have 0 active/running sesions and are `MarkedForDeletion`). The deletion will happen via the `ACIDelete` Function.

![alt text](media/states.jpg "States and Transition")

## FAQ

#### What is this **.deployment** file at the root of the project?
This guides the [Kudu](https://github.com/projectkudu/kudu) engine as to where the source code for the Functions is located, in the GitHub repo. Check [here](https://github.com/projectkudu/kudu/wiki/Customizing-deployments) for details.

#### Why are there 4 ARM templates instead of one?
Indeed, there 4 4 ARM files on the project. They are executed in the following order:
- **deploy.json**: The master template that deploys the next two
- **deploy.function.json**: Deploys the Azure Function App that contains the Functions of our project
- **deploy.function.config.json**: As we need to set an environment variable that gets the value of our 'ACISetSessions' Function trigger URL, we need to set up this template that executes *after* the deployment of the Azure Function App has completed.
- **deploy.eventgridsubscription.json**: This template can be deployed manually after the deployment of the others has completed. We need the Function App name plus the URL of the ACIMonitor Function.

#### I want to handle more events from Azure Event Grid. Where is the definition of those events?
Check [here](https://docs.microsoft.com/en-us/azure/event-grid/event-schema-resource-groups) for resource group events and [here](https://docs.microsoft.com/en-us/azure/event-grid/event-schema-subscriptions) for subscription-wide events.

#### How can I troubleshoot my Azure Container Instances?
As always, Azure documentation is your friend, check [here](https://docs.microsoft.com/en-us/azure/container-instances/container-instances-troubleshooting).

#### How can I manage Keys for my Functions?
Check [here](https://github.com/Azure/azure-functions-host/wiki/Key-management-API) to read some details about Azure Function's key management API. You can easily retrieve them from the Azure Portal by visiting each Function's page.

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

#### I need to modify the ARM templates you provide, where can I find more information?
You can check the Azure Resource Manager documentation [here](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-overview).