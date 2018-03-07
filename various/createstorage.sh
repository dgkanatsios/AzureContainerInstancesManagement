#!/bin/bash

# Change these parameters as needed
ACI_PERS_STORAGE_ACCOUNT_NAME=openarena$RANDOM
ACI_PERS_LOCATION=westeurope # for better performance, choose the location that your Azure Container Instances will be deployed
ACI_PERS_SHARE_NAME=openarenadata
ACI_PERS_RESOURCE_GROUP=acimanagement #resource group where you want to deploy your Azure Files share. You can use the same one as your Functions

echo 'Creating Storage Account'

# Create the storage account with the provided parameters
az storage account create \
    --resource-group $ACI_PERS_RESOURCE_GROUP \
    --name $ACI_PERS_STORAGE_ACCOUNT_NAME \
    --location $ACI_PERS_LOCATION \
    --sku Standard_LRS

# Export the connection string as an environment variable. The following 'az storage share create' command
# references this environment variable when creating the Azure file share.
export AZURE_STORAGE_CONNECTION_STRING=`az storage account show-connection-string --resource-group $ACI_PERS_RESOURCE_GROUP --name $ACI_PERS_STORAGE_ACCOUNT_NAME --output tsv`

echo 'Creating Azure File Share'

# Create the file share
az storage share create -n $ACI_PERS_SHARE_NAME

# Get Storage credentials
STORAGE_ACCOUNT=$(az storage account list --resource-group $ACI_PERS_RESOURCE_GROUP --query "[?contains(name,'$ACI_PERS_STORAGE_ACCOUNT_NAME')].[name]" --output tsv)
echo $STORAGE_ACCOUNT

STORAGE_KEY=$(az storage account keys list --resource-group $ACI_PERS_RESOURCE_GROUP --account-name $STORAGE_ACCOUNT --query "[0].value" --output tsv)
echo $STORAGE_KEY