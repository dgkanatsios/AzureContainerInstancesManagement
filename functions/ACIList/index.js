const utilities = require('../shared/utilities');
const listhelpers = require('./listhelpers');


module.exports = function (context, req) {
        listhelpers.listRunningACIs(req.body).then((res) => {
            context.res = res;
            context.done();
        }).catch(error => {
            context.error(error);
            utilities.setErrorAndCloseContext(context, error, 500);
        });
   

};

//POST Data is empty
/*
{}
*/