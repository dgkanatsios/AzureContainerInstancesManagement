const garbagecollectionhelpers = require('./garbagecollectionhelpers');

module.exports = function (context, myTimer) {
    const timeStamp = new Date().toISOString();

    if (myTimer.isPastDue) {
        context.log('Node.js is running late!');
    }
    context.log('GC timer trigger function ran!', timeStamp);
    garbagecollectionhelpers.deleteAllMarkedForDeletionWithZeroSessions().then(
        (res) => {
            context.log(res);
            context.done();
        }).catch(err => {
        context.log.error(err);
        context.done(err);
    });
};

//runs every 5'