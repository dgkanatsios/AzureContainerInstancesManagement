const utilities = require('../shared/utilities');
const markfordeletionhelpers = require('./markfordeletionhelpers');

module.exports = function (context, req) {
    if (utilities.validatePostData(req.body)) {
        markfordeletionhelpers.setStateAsMarkedForDeletion(req.body).catch(error => {
            utilities.setErrorAndCloseContext(context, error, 500);
        }).then(() => {
            context.res = {
                body: 'Marked for deletion OK'
            };
            context.done();
        });
    } else {
        utilities.setErrorAndCloseContext(context, 'Need POST Data with resourceGroup and containerGroupName', 400);
    }

};

//POST data is
/*
const acidata = [{
    resourceGroup: '',
    containerGroupName: ''
}];
*/