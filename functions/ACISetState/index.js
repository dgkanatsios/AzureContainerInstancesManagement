const utilities = require('../shared/utilities');
const setstatehelpers = require('./setstatehelpers');

module.exports = function (context, req) {
    if (utilities.validateSetStateData(req.body)) {
        setstatehelpers.setState(req.body).catch(error => {
            utilities.setErrorAndCloseContext(context, error, 500);
        }).then((res) => {
            context.res = {
                body: res
            };
            context.done();
        });
    } else {
        utilities.setErrorAndCloseContext(context, "Need POST Data with 'resourceGroup' and 'containerGroupName' and 'state' - set either to 'MarkedForDeletion' or 'Failed'", 400);
    }

};

//POST data is
/*
const acidata = 
{
    resourceGroup: '',
    containerGroupName: '',
    state:'MarkedForDeletion'
}
;

//state is either MarkedForDeletion or Failed
*/