const utilities = require('../shared/utilities');
const deletehelpers = require('./listhelpers');


module.exports = function (context, req) {
    if (utilities.validatePostData(req.body)) {
        deletehelpers.deleteContainerGroup(req.body).then(() => {
            return deletehelpers.deleteACIFromTable(req.body);
        }).then((res) => {
            context.res = res;
            context.done();
        }).catch(error => {
            context.error(error);
            utilities.setErrorAndCloseContext(context, error, 500);
        });
    } else {
        utilities.setErrorAndCloseContext(context, 'Need to specify resourceGroup and containerGroupName', 400);
    }

};

//POST Data
/*
{
    resourceGroup: "acitest123",
    containerGroupName: "cigroup2"
}
*/