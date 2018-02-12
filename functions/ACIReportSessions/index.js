const utilities = require('../shared/utilities');
const reportsessionshelpers = require('./reportsessionshelpers');

module.exports = function (context, req) {
    if (utilities.validateReportSessionsData(req.body)) {
        reportsessionshelpers.setSessions(req.body).catch(err => context.error(err)).then(() => context.done());
    } else {
        context.done();
    }

};