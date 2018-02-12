const createhelpers = require('./createhelpers');
const utilities = require('../shared/utilities');





module.exports = function (context, req) {
    if (utilities.validatePostData(req.body)) {
        createhelpers.createContainerGroup(req.body).then(() => createhelpers.insertIntoTable(req.body)).catch(error => context.error(error)).then(() => context.done());
    } else {
        context.done();
    }
};