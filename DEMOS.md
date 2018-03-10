[![unofficial Google Analytics for GitHub](https://gaforgithub.azurewebsites.net/api?repo=AzureContainerInstancesManagement-demos)](https://github.com/dgkanatsios/gaforgithub)

# AzureContainerInstancesManagent - Demos

![OpenArena collage](https://vignette.wikia.nocookie.net/openarena/images/9/9e/OpenArena_Collage.jpg/revision/latest?cb=20080625093517)

*OpenArena game*


<img src="https://www.teeworlds.com/images/screens/screenshot_jungle.png" alt="Teeworlds" width="450">

*Teeworlds game*


We have created two demos for you to test this project with, both of which are related games. We have modified the Docker images of the popular open source games [OpenArena](http://openarena.wikia.com/wiki/Main_Page) and [Teeworlds](https://www.teeworlds.com/), both of which can easily be used to demonstrate this project. You can find the modified Docker image for OpenArena [here](https://github.com/dgkanatsios/docker_openarena) and for Teeworlds [here](https://github.com/dgkanatsios/docker-teeworlds). Both repos have been configured with [Docker Hub automated build](https://docs.docker.com/docker-hub/builds/). In this way, every push to GitHub modifies the images on Docker Hub ([OpenArena](https://hub.docker.com/r/dgkanatsios/docker_openarena/) and [Teeworlds](https://hub.docker.com/r/dgkanatsios/docker-teeworlds/)).

The steps to run the demo for both games are pretty similar. The big difference is that in the case of the OpenArena game we have taken the game's files (executables, assets, everything) outside the Docker image, in order to save on its final size. We will use an [Azure File share](https://docs.microsoft.com/en-us/azure/storage/files/storage-files-introduction) to store the files. This share will be `volume mounted` from the running container when it's created. So, here are the steps that you could use if you wanted to set up a quick demo of the project:

- (*OpenArena game only*) You need to create an Azure Storage account to store the game's files. Use the following script from either [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/overview?view=azure-cli-latest) or [Azure Cloud Shell](https://azure.microsoft.com/en-us/features/cloud-shell/):
```bash
# Change these parameters as needed
ACI_PERS_STORAGE_ACCOUNT_NAME=openarena$RANDOM
ACI_PERS_LOCATION=westeurope # for better performance, choose the location that your Azure Container Instances will be deployed
ACI_PERS_SHARE_NAME=openarenadata
ACI_PERS_RESOURCE_GROUP=acimanagement #resource group where you want to deploy your Azure Files share. You can use the same one as your Functions

# Create the storage account with the provided parameters
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

You can also find this script in the `various` folder [here](various/createstorage.sh).

Keep the STORAGE_ACCOUNT and STORAGE_KEY credentials handy as you will need them when you will deploy your Container Group for OpenArena game.
- (*OpenArena game only*) Download the game and place all its files onto the Azure File share you created. You can
    - download the files locally and use [Azcopy](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy) or [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) to upload them on the share
    - mount the share locally or on an Azure VM, download the files and transfer them via SMB (this proved to be must faster in our tests). You can use this command on Windows
    ```bash
    net use Z: \\accountname.file.core.windows.net\openarenadata /u:accountname key_ending_in==
    ```
    or this one on Linux
    ```bash
    sudo mount -t cifs //accountname.file.core.windows.net/openarenadata /path -o vers=3.0,username=accountname,password=key_ending_in==,dir_mode=0777,file_mode=0777
    ```
    Bear in mind that in the end, OpenArena files should exist directly in the path you specify. For instance, if you selected `/path` as the mount folder, the `pak0.pk3` file's full path should be `/path/baseoa/pak0.pk3`.
    To do this on Linux, you could try
    ```bash
    unzip path/to/openarena.zip -d /temppath
    cd /temppath
    cd openarena-0.8.8
    mv * /path
    ```
- Download the game of your choice. For OpenArena check [here](http://openarena.wikia.com/wiki/Download_Mirrors) and for Teeworlds check [here](https://www.teeworlds.com/?page=downloads) for download links.
- You need to create an Azure Service Principal. This is an identity that has permission to create/update/delete Azure Resources, it will be used to interact with our Container Instances. Check [here](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal) for instructions on how to do it from the Azure Portal and [here](https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli?toc=%2Fazure%2Fazure-resource-manager%2Ftoc.json&view=azure-cli-latest) for Azure CLI instructions (much faster). Keep the Client ID and secret handy as you will need them during deployment.
- Deploy the project in your Azure subscription. You can use one-click deployment, as described in [README.md](README.md).
- Deploy the Event Grid subscription for the **ACIMonitor** Function. You can create the subscription by visiting the `ACIMonitor` Function page on the Azure portal (check [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#create-a-subscription) for instructions). Once you get the webhook URL, you can also use the [deploy.eventgridsubscription.json](deploy.eventgridsubscription.json) file to deploy the Event Grid subscription. To do that, go to the Azure portal and ask to create a `Template Deployment` resource. When you deploy your Event Grid suscription, make sure that you're monitoring **all** events on either the Resource Group you're planning to create your Container Instances on or your entire subscription.
- Call the **ACICreate** Function to create an Azure Container Instance with the image of your game. You can get Function's URL (including the key) from the Azure Portal ([instructions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-first-azure-function#test-the-function)) and use the provided [Postman](https://www.getpostman.com/) files (located [here](various)) to begin. There are two POSTMAN exported collections, one for each game.
For the OpenArena you can use the following POST body. Make sure you change the values `resourceGroup`, `containerGroupName`, `containers[0].name`,`containers[0].volumeMounts.name`,`containerGroup.volumes[0].name`, `containerGroup.ipAddress.dnsNameLabel` as well as the values in `containerGroup.volumes[0].azureFile` object.
```javascript
{
    "resourceGroup": "acimanagement",
    "containerGroupName": "openarenaserver1",
    "containerGroup" : {
        "location": "westeurope",
        "containers": [{
            "name": "openarenaserver1",
            "image": "dgkanatsios/docker_openarena", 
            "environmentVariables": [{
                "name":"SERVER_NAME",
                "value":"AzureOpenArena1"
            },{
            	"name":"OA_STARTMAP",
            	"value":"dm4ish"
            },{
            	"name":"OA_PORT",
            	"value":"27960"
            }],
            "resources": {
                "requests": {
                    "memoryInGB": 0.5,
                    "cpu": 1
                }
            },
            "ports": [{
                "protocol": "udp",
                "port": 27950
            },{
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
                "port": 27950
            },{
                "protocol": "udp",
                "port": 27960
            }],
            "type": "Public",
	    "dnsNameLabel": "customDNSName"
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

For teeworlds you could use this script, modify the `resourceGroup`, `containerGroupName`, `containers[0].name`, `containerGroup.ipAddress.dnsNameLabel` values as well as the `SERVER_NAME` environment variable.
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
                    "cpu": 1
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
            "type": "Public",
	    "dnsNameLabel": "customDNSName"
        },
        "osType": "Linux"
    }
}
```
As you can easily notice, OpenArena requires port 27960/udp and Teeworlds requires port 8303/udp in order to function correctly.
- Once your Docker container is deployed, you will see a new entry in your Azure Table. The Storage account that contains this Table should have a name similar to `RANDOM_STRINGacidetails` whereas the actual table name is `ACIDetails`. You can use [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) to monitor it. Container should be in the **Creating** state.
- After a couple of minutes the instance should be running, so you'll see in the table storage that it has transitioned to the **Running** state, having a Public IP.
- Call the **ACIList** Function to see your **Running** Container Instances. If result is something like the below, you have successfully set up your OpenArena/Teeworlds game server on Azure Container Instances!
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
- You can use this IP to connect to the game server you just set up. Start the game client and connect to this IP.
- If you now check your Table Storage (or call the **ACIList** Function again), you should see that ActiveSessions for the server you connected to are equal to 1. This number should increase as more clients connect to your container instance. This happens because both game images are configured to call the **ACISetSessions** Function when a user connects/disconnect to the server. The way this is done is pretty basic (and error-prone), since game servers log everything (including connections/disconnections) to STDOUT, we're just filtering it to a custom shell script and increasing a value in a text file. To see more details about it, check the `stdoutprocessor.sh` file in both Docker images. In a production environment, game server itself should call the **ACISetSessions** URL.
- To get the logs from your game server, use the **ACIDetails** Function. If you omit the `type:"logs"` from the POST body, you should see the Azure Resource details for your container.
- Now, suppose that you do not need this container instance any more. You may call **ACIDelete** Function to delete it at once, but there may be players that are currently playing the game. Of course, you do not want to ruin their experience, right? What you can do is call the **ACISetState** Function and set the container's state to `MarkedForDeletion`. That would be the POST body:
```javascript
{
    resourceGroup: "teworlds",
    containerGroupName: "teeserver1",
    state:"MarkedForDeletion"
}
```
Of course, we suppose that since it's `MarkedForDeletion`, no other games will be scheduled on this container. This container will not be reported when **ACIList** is called (since it retrieves info only about `Running` Container Instances).
- The **ACIGC** Function, which is being triggered in specific time intervals, will eventually kick-in and delete this Container Group resource since a) it's 'MarkedForDeletion' and b) it has 0 active sessions (we suppose that the game session has ended or players have left the server).
- To cleanup the resources you deployed for this demo, you should delete the Resource Group(s) where you deployed your resources as well as your Event Grid Subscriptions. To find these, use [this](https://docs.microsoft.com/en-us/azure/event-grid/monitor-event-delivery#event-subscription-status) article.
