const utilities = require('../shared/utilities');
const setsessionshelpers = require('./setsessionshelpers');

module.exports = function (context, req) {
    if (utilities.validateSetSessionsData(req.body)) {
        setsessionshelpers.setSessions(req.body).catch(error => {
            utilities.setErrorAndCloseContext(context, error, 500);
        }).then((res) => {
            context.res = {
                body: res
            };
            context.done();
        });
    } else {
        utilities.setErrorAndCloseContext(context, 'Need to specify array of object containing resourceGroup, containerGroupName, activeSessions', 400);
    }

};

//POST data is
/*
const acidata = [{
    resourceGroup: '',
    containerGroupName: '',
    activeSessions: 5
}];
*/