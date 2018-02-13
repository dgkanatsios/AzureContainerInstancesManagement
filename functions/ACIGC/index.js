const garbagecollectionhelpers = require('./garbagecollectionhelpers');

module.exports = function (context, myTimer) {
    const timeStamp = new Date().toISOString();

    if (myTimer.isPastDue) {
        context.log('Node.js is running late!');
    }
    context.log('Node.js timer trigger function ran!', timeStamp);
    garbagecollectionhelpers.deleteAllMarkedForDeletionWithZeroSessions().then(
        (res) => {
            context.log(res);
            context.done();
        }).catch(err => {
        context.error(err);
        context.done();
    });
};

//runs every 5'