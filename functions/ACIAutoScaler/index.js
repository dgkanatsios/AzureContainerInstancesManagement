const autoscalerhelpers = require('./autoscalerhelpers');

module.exports = function (context, myTimer) {
    const timeStamp = new Date().toISOString();

    if (myTimer.isPastDue) {
        context.log('Node.js is running late!');
    }
    context.log('Autoscaler trigger function ran!', timeStamp);
    autoscalerhelpers.handleScaleInOut(context).then(
        (res) => {
            context.log(res);
            context.done();
        }).catch(err => {
        context.log.error(err);
        context.done(err);
    });
};
