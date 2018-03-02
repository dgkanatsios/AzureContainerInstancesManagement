const utilities = require('../shared/utilities');
const listhelpers = require('./listhelpers');
const fs = require('fs');
const path = require('path');
let cachedFileContents = '';

module.exports = function (context, req) {
    if (req.query.html) {//user wants to see the HTML page
        if (cachedFileContents !== '') {
            //context.log('serving cache');
            sendHtmlResponse(context, cachedFileContents);
        } else {
            //context.log('not serving cache');
            fs.readFile(path.resolve(__dirname, 'index.html'), 'utf8', function (err, contents) {
                if (err) {
                    context.log(err);
                    utilities.setErrorAndCloseContext(context, err, 500);
                } else {
                    cachedFileContents = contents;
                    sendHtmlResponse(context, contents);
                }
            });
        }

    } else {//user calls our API
        listhelpers.listRunningACIs(req.body).then((res) => {
            context.res = {
                status: 200,
                body: res,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            context.done();
        }).catch(error => {
            context.log(error);
            utilities.setErrorAndCloseContext(context, error, 500);
        });
    }
};

function sendHtmlResponse(context, html) {
    context.res = {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html'
        },
        body: html
    };
    context.done();
}

//for JSON response no GET or POST data is needed
//for HTML response, an 'html' is needed on query string