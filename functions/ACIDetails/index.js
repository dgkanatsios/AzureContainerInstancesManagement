const utilities = require('../shared/utilities');
const detailshelpers = require('./detailshelpers');

//returns details a container
module.exports = function (context, req) {
    if (utilities.validatePostData(req.body)) {
        detailshelpers.getContainerGroupDetails(req.body).then((res) => {
            context.res = {
                body: res
            };
            context.done();
        }).catch(error => {
            utilities.setErrorAndCloseContext(context, error, 500);
        });
    } else {
        utilities.setErrorAndCloseContext(context, 'Need to specify resourceGroup and containerGroupName', 400);
    }
};

//sample POST data
//the request can optionally contain a type:"logs" property. If this is the case, a "containerName" must be provided. 
//Then the Function will retrieve the logs of the container on this container group
/*
{
    resourceGroup: "acitest123",
    containerGroupName: "cigroup"
}


or 

{
    resourceGroup: "acitest123",
    containerGroupName: "cigroup2",
    type:"logs",
    containerName: "ciname"
}
*/