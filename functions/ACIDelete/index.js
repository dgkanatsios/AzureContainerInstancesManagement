const utilities = require('../shared/utilities');
const deletehelpers = require('./deletehelpers');


module.exports = function (context, req) {
    if (utilities.validatePostData(req.body)) {
        deletehelpers.deleteContainerGroup(req.body).then(() => {
            deletehelpers.setInTableAsDeleting(req.body)
        }).catch(error => context.error(error)).then(() => context.done());
    } else {
        context.done();
    }

};