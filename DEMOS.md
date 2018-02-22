[![unofficial Google Analytics for GitHub](https://gaforgithub.azurewebsites.net/api?repo=AzureContainerInstancesManagement-demos)](https://github.com/dgkanatsios/gaforgithub)

# AzureContainerInstancesManagent - Demos

We have created two demos for you to test this project with, both of which are games. We have created a Docker image of the popular game open source game [Teeworlds](https://www.teeworlds.com/) and the game [OpenArena](http://openarena.wikia.com/wiki/Main_Page) that can be used to demonstrate this project. Steps for the two of them are pretty similar. The big difference is that in the case of the OpenArena game we have taken the game's assets outside the container, in order to save on the final size. Here are the steps that you could use if you wanted to set up a quick demo of the project:

- (*OpenArena game only*) You need to create a separate Azure Storage account to store the game's assets. Use the following script
```bash
# Change these four parameters as needed
ACI_PERS_RESOURCE_GROUP=resource group
ACI_PERS_STORAGE_ACCOUNT_NAME=openarena$RANDOM
ACI_PERS_LOCATION=westeurope
ACI_PERS_SHARE_NAME=openarenadata

# Create the storage account with the parameters
az storage account create \
    --resource-group $ACI_PERS_RESOURCE_GROUP \
    --name $ACI_PERS_STORAGE_ACCOUNT_NAME \
    --location $ACI_PERS_LOCATION \
    --sku Standard_LRS

# Export the connection string as an environment variable. The following 'az storage share create' command
# references this environment variable when creating the Azure file share.
export AZURE_STORAGE_CONNECTION_STRING=`az storage account show-connection-string --resource-group $ACI_PERS_RESOURCE_GROUP --name $ACI_PERS_STORAGE_ACCOUNT_NAME --output tsv`

# Create the file share
az storage share create -n $ACI_PERS_SHARE_NAME

# Get Storage credentials
STORAGE_ACCOUNT=$(az storage account list --resource-group $ACI_PERS_RESOURCE_GROUP --query "[?contains(name,'$ACI_PERS_STORAGE_ACCOUNT_NAME')].[name]" --output tsv)
echo $STORAGE_ACCOUNT

STORAGE_KEY=$(az storage account keys list --resource-group $ACI_PERS_RESOURCE_GROUP --account-name $STORAGE_ACCOUNT --query "[0].value" --output tsv)
echo $STORAGE_KEY
```
- (*OpenArena game only*) Download the game and place all its files onto the Azure File share you created. You can
    - download the files locally and use [Azcopy](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy) or [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) to upload them on the share
    - mount the share locally or on an Azure VM, download the files and transfer them via SMB. You can use this command on Windows
    ```bash
    net use Z: \\accountname.file.core.windows.net\openarenadata /u:accountname key_ending_in==
    ```
    or this one on Linux
    ```bash
    sudo mount -t cifs //accountname.file.core.windows.net/openarenadata /path -o vers=3.0,username=accountname,password=key_ending_in==,dir_mode=0777,file_mode=0777
    ```
- You need to create an Azure Service Principal. This is an identity that has permission to create/update/delete Azure Resources. Check [here](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal) for instructions on how to do it from the Azure Portal.
- Deploy the project in your Azure subscription (you can use one-click deployment, as described in the beginning).
- Deploy the Event Grid subscription for the **ACIMonitor** Function. You can either deploy the [deploy.eventgridsubscription.json](deploy.eventgridsubscription.json) file (via the portal, ask to create a resource via `Template Deployment`) or use Azure portal or CLI directly to the **ACIMonitor** Function ([instructions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#create-a-subscription)). When you deploy, make sure that you're monitoring **all** events on either the Resource Group you're planning to create your Container Instances on or your entire subscription.
- Call the **ACICreate** Function to create an Azure Container Instance with the dgkanatsios/docker-teeworlds image. You can get Function's key from the Azure Portal ([instructions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-first-azure-function#test-the-function)) and use the provided [Postman](https://www.getpostman.com/) file (located [here](various/ACIManagement.postman_collection.json)) to begin. POST body should be similar to (yeah, half a GB memory/CPU is more than enough):
For teeworlds you could use this:
```javascript
{
    "resourceGroup": "teeworlds",
    "containerGroupName": "teeserver1",
    "containerGroup" : {
        "location": "westeurope",
        "containers": [{
            "name": "teeserver1",
            "image": "dgkanatsios/docker-teeworlds", 
            "environmentVariables": [{
                "name":"SERVER_NAME",
                "value":"Azure-Dimitris-1"
            }],
            "resources": {
                "requests": {
                    "memoryInGB": 0.5,
                    "cpu": 0.5
                }
            },
            "ports": [{
                "protocol": "udp",
                "port": 8303
            }]
        }],
        "ipAddress": {
            "ports": [{
                "protocol": "udp",
                "port": 8303
            }],
            "type": "Public"
        },
        "osType": "Linux"
    }
}
```
whereas for OpenArena you could use this
```javascript
{
    "resourceGroup": "teeworlds",
    "containerGroupName": "openarenaserver1",
    "containerGroup" : {
        "location": "westeurope",
        "containers": [{
            "name": "openarenaserver1",
            "image": "dgkanatsios/docker_openarena", 
            "environmentVariables": [{
            	"name":"OA_STARTMAP",
            	"value":"dm4ish"
            },{
            	"name":"OA_PORT",
            	"value":"27960"
            }],
            "resources": {
                "requests": {
                    "memoryInGB": 0.5,
                    "cpu": 0.5
                }
            },
            "ports": [{
                "protocol": "udp",
                "port": 27960
            }],
            "volumeMounts":[{
            	"name":"openarenadatavolume",
            	"mountPath": "/data",
            	"readOnly": false
            }
            	]
        }],
        "ipAddress": {
            "ports": [{
                "protocol": "udp",
                "port": 27960
            }],
            "type": "Public"
        },
        "osType": "Linux",
        "volumes": [{
		  "name": "openarenadatavolume",
		  "azureFile": {
		    "shareName": "openarenadata",
		    "storageAccountName": "storage account name",
		    "storageAccountKey": "account key ending in=="
		  }
		}]
    }
}
```
As you can easily notice, game requires only one open port (8303/udp) in order to function correctly.
- Once it's deployed, you will see an entry in your Azure Table. You can use [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) to monitor it. Container should be in the **Creating** state.
- Hopefully Event Grid integration works, so after a couple of minutes your instance should have transitioned to the **Running** state, having a Public IP. The Storage account that contains this Table should have a name similar to `RANDOM_STRINGacidetails`.
- Call the **ACIList** Function to see your **Running** Container Instances. If result is something like the below, you have successfully set up your Teeworlds game server on Azure!
```javascript
[
    {
        "resourceGroup": "teeworlds",
        "containerGroupName": "teeserver1",
        "PublicIP": "168.63.121.114",
        "ActiveSessions": 0
    }
]
```
- You can use this IP to connect to the Teeworlds server you just set up. Download the [Teeworlds client](https://www.teeworlds.com/?page=downloads) and connect to it.
- If you now check your Table Storage (or call the **ACIList** Function again), you should see that ActiveSessions are 1. This number should increase as more clients connect to your container server. This happens because the `dgkanatsios/docker-teeworlds` image is configured to call the **ACISetSessions** Function when a user connects/disconnect to the server.
- To get the logs from your server, use the **ACIDetails** Function. If you omit the `type:"logs"` from the POST body, you should see the Azure Resource details for your container.
- Now, suppose that you do not need this container instance any more. You may call **ACIDelete** Function, but there may be players that are currently playing the game. Of course, you do not want to ruin their experience, right? What you can do is call the **ACISetState** Function and set the container's state to `MarkedForDeletion`. That would be the POST body:
```javascript
{
    resourceGroup: "teworlds",
    containerGroupName: "teeserver1",
    state:"MarkedForDeletion"
}
```
Of course, we suppose that since it's `MarkedForDeletion`, no other games will be scheduled on this container.
- The **ACIGC** Function, which is being triggered in specific time intervals, will eventually kick-in and delete your Container Group resource when a) it's 'MarkedForDeletion' and b) it has 0 active sessions.
- To cleanup, you should release the Resource Group(s) to where you deployed your resources to as well as your Event Grid Subscriptions. To find them, use [this](https://docs.microsoft.com/en-us/azure/event-grid/monitor-event-delivery#event-subscription-status) article.