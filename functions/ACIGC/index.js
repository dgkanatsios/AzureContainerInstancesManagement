const utilities = require('../shared/utilities');
const garbagecollectionhelpers = require('./garbagecollectionhelpers');

module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();

    if (myTimer.isPastDue) {
        context.log('Node.js is running late!');
    }
    context.log('Node.js timer trigger function ran!', timeStamp);
    garbagecollectionhelpers.deleteAllMarkedForDeletionWithZeroSessions().then(
        () => {
            context.log('delete all OK');
            context.done()
        }).catch(err => {
        context.error(err);
        context.done()
    });
};

//runs every minute