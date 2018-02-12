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
//the request can optionally contain a type:"logs" property. In this case, the Function will retrieve the logs of the container group
/*
{
    resourceGroup: "acitest123",
    containerGroupName: "cigroup"
}
*/