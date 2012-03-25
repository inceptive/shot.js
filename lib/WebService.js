/**
 * @public
 * @class Shot.WebService
 * @author Aron Homberg <info@aron-homberg.de>
 *
 * Implements a web service which handles incomming requests
 * to take photos of web pages by remote control.
 */
Shot.WebService = {


    /**
     * @protected
     * @var {phantom.webserver} _server Webserver instance
     */
    _server: null,


    /**
     * @protected
     * @var {phantom.webservice} _service Webservice instance
     */
    _service: null,


    /**
     * @protected
     * @var {String} _apiKey API security key
     */
    _apiKey: null,


    /**
     * @protected
     * @var {phantom.fs} _fs Filesystem API reference
     */
    _fs: null,


    /**
     * @protected
     * @var {Boolean} _responseSuccess Success flag for processing results, synchronous
     */
    _responseSuccess: null,


    /**
     * @protected
     * @var {String} _responseErrorMessage Processing error message, synchronous
     */
    _responseErrorMessage: '',


    /**
     * @protected
     * @var {Boolean} _inLoadingState Processing state, synchronous
     */
    _inLoadingState: false,


    /**
     * @protected
     * @var {String} _currentTempFilePath Current temp image file path, synchronous
     */
    _currentTempFilePath: '',


    /**
     * @protected
     * @var {Number} _refreshTime Refresh time for auto-refreshing HTTP clients, synchronous
     */
    _refreshTime: 2,


    /**
     * @public
     *
     * Listens on a specified host/port as HTTP server.
     *
     * @param {Number} port Port number
     * @param {String} apiKey Security API service key
     *
     * @return void
     */
    listen: function(port, apiKey) {

        // Assign API key on instance leve
        this._apiKey = apiKey;

        // Create a webserver instance
        if (this._server === null) {
            this._server = require('webserver').create();
        }

        console.log('Shot.js WebService: Listening to localhost:' + port);
        console.log('Shot.js WebService: Secure API key is:' + apiKey);

        // Create an service instance
        this._service = this._server.listen(port, this.handleServiceRequest);
    },


    /**
     * @protected
     *
     * ATTENTION: DUE TO DISADVANTAGES IN PHANTOM.JS HTTP SERVER IT'S WASN'T
     *            POSSIBLE TO IMPLEMENT AN ASYNC MODE. SO THIS SERVER IS
     *            SYNCHRONOUS AND WORKS USING RETRY/REFRESH UNTIL A
     *            RESPONSE CAN BE DISPATCHED. SORRY, CONSULT THE PHANTOM.JS
     *            DEV'S TO FIX THEIR API. response.write() / response.close()
     *            SIMPLY DOESN'T WORK IN A DEFERRED JS FUNCTION. RESPONSE
     *            OBJECT IS "UNDEFINED" / DELETED AND CLIENT CONNECTION CLOSED
     *            WITH EMPTY RESULT SET!
     *
     *            THIS MEANS: ONE RENDERING REQUEST AFTER ANOTHER.
     *            WILL BE FIXED WHEN PHANTOM GET'S FIXED. (HOPEFULLY IN 1.6)
     *
     * Dispatches incomming HTTP requests
     *
     * @param  {phantom.webserver.Request} request HTTP request object
     * @param {phantom.webserver.Response} response HTTP response object
     *
     * @return void
     */
    handleServiceRequest: function(request, response) {

        console.debug('');
        console.debug(request.method + ' ' + request.url);

        // Do never dispatch HTTP requests without API key
        if (request.url.indexOf('apiKey') == -1) {

            // API key wrong response
            Shot.WebService.respondApiKeyWrong(response);
            return;
        }

        // Parse incomming HTTP request parameters
        var queryParams = Shot.WebService.getQueryParams(request.url);

        // Check for webservice API key (security, DOS prevention)
        if (queryParams.apiKey !== null &&
            queryParams.apiKey === Shot.WebService._apiKey) {

            // Do call the camera only in non-blocking mode
            // when no request is currently processing!
            if (Shot.WebService._inLoadingState === false) {

                // Set blocking
                Shot.WebService.setBlocking();

                // Overlay by default if not possible
                if (queryParams.networkTimeout === null) {
                    queryParams.networkTimeout = Shot._defaultNetworkTimeout;
                }

                // Refresh time is in seconds
                Shot.WebService._refreshTime = queryParams.networkTimeout / 1000;

                // Get a temporary file path
                Shot.WebService._currentTempFilePath = Shot.WebService.getTmpFilePath();

                // Take a photo using website Camera
                Shot.Camera.takePhoto(
                    queryParams.url, Shot.WebService._currentTempFilePath,
                    queryParams.renderDelay, queryParams.networkTimeout,
                    function(success, errorMessage) {

                        Shot.WebService._responseSuccess = success;
                        Shot.WebService._responseErrorMessage = errorMessage;
                    }
                );
            }

            // Send the HTTP response
            Shot.WebService.sendResponse(
                response,
                Shot.WebService._currentTempFilePath,
                Shot.WebService._responseSuccess,
                Shot.WebService._responseErrorMessage
            );

        } else if (queryParams.apiKey !== Shot.WebService._apiKey) {

            // API key wrong response
            Shot.WebService.respondApiKeyWrong(response);
        }
    },


    /**
     * @protected
     *
     * Replies that the API key is wrong.
     *
     * @param {phantom.webserver.Response} response HTTP response object
     *
     * @return void
     */
    respondApiKeyWrong: function(response) {

        var errorMessage = 'Request aborted. Wrong API key.';

        // Show error in console
        console.debug(errorMessage);

        // Reply error to HTTP client
        response.statusCode = 500;
        response.headers = {
            'Cache': 'no-cache'
        };
        response.write(errorMessage);
    },


    /**
     * @protected
     *
     * Replies the photo taken by camera using HTTP response or
     * replies an HTTP refresh/error if photo wasn't already taken (is loading currently).
     *
     * @param {phantom.webserver.Response} response HTTP response object
     * @param {String} tempFilePath Path of the temporary file the photo is stored in
     * @param {Boolean} success Success flag; If set to true, the camara made a photo
     * @param {String} errorMessage If success == false, an error message is given by camera
     *
     * @return void
     */
    sendResponse: function(response, tempFilePath, success, errorMessage) {

        if (success === null) {

            var message = 'Processing...';

            // Show processing message
            console.debug(message);

            response.statusCode = 200;

            response.headers = {
                'Cache': 'no-cache',
                'Content-Type': 'text/plain',
                'Content-Length': message.length,
                'Refresh': Shot.WebService._refreshTime
            };
            response.write(message);

            // Set blocking
            Shot.WebService.setBlocking();

        } else if (success === false) {

            response.statusCode = 500;
            response.headers = {
                'Cache': 'no-cache',
                'Content-Type': 'text/plain',
                'Content-Length': errorMessage.length
            };

            // Write out error message
            response.write(errorMessage);

            // Set non-blocking
            Shot.WebService.setNonBlocking();

        } else if (success === true) {

            response.statusCode = 200;
            response.headers = {
                'Cache': 'no-cache',
                'Content-Type': 'text/plain',
                'Content-Length': tempFilePath.length
            };

            console.debug('Done.');

            // Write the whole image
            response.write(tempFilePath);

            // Set non-blocking
            Shot.WebService.setNonBlocking();
        }
    },


    /**
     * @protected
     *
     * Sets the service blocking
     *
     * @return void
     */
    setNonBlocking: function() {

        // Reset response flags globally
        Shot.WebService._responseSuccess = null;
        Shot.WebService._responseErrorMessage = "";

        // Set non-blocking
        Shot.WebService._inLoadingState = false;
    },


    /**
     * @protected
     *
     * Sets the service blocking
     *
     * @return void
     */
    setBlocking: function() {

        // Set non-blocking
        Shot.WebService._inLoadingState = true;
    },


    /**
     * @protected
     *
     * Simple implementation of a HTTP server request URL query
     * parser which also evaluates the parameters url, renderDelay
     * and apiKey specially for our purpose.
     *
     * @param {String} requestUrl HTTP request URL
     *
     * @return {Object}
     */
    getQueryParams: function(requestUrl) {

        var queryString = requestUrl.split('?')[1],
            params = queryString.split('&'),
            currentParam = null,
            targetUrl = null, renderDelay = null,
            networkTimeout = null, apiKey = null;

        // Evaluate the HTTP GET / URL request params
        for (var i=0; i<params.length; i++) {

            currentParam = params[i].split('=');

            switch (currentParam[0]) {

                case 'url':
                    targetUrl = currentParam[1];
                    break;

                case 'renderDelay':
                    renderDelay = currentParam[1];
                    break;

                case 'timeout':
                    networkTimeout = currentParam[1];
                    break;

                case 'apiKey':
                    apiKey = currentParam[1];
                    break;
            }
        }

        // Return parsed parameter as objects
        return {
            url: targetUrl,
            renderDelay: renderDelay,
            networkTimeout: networkTimeout,
            apiKey: apiKey
        };
    },


    /**
     * @protected
     *
     * Generates a temporary file path to render website photo into
     * and returns its path name.
     *
     * @return {String}
     */
    getTmpFilePath: function() {

        // Require filesystem API if not fetched before
        if (this._fs === null) {
            this._fs = require('fs');
        }

        // Generate a near-unique temp file name
        var tmpPath = this._fs.workingDirectory + this._fs.separator +
                      'tmp' + this._fs.separator;

        var tmpFileName = 'tmp_' + new Date().getMilliseconds() + Math.random();

        // Replace dots by _
        tmpFileName = tmpFileName.replace(/\./g, '_');
        tmpFileName = tmpFileName.slice(0, 10) + '.png';

        return tmpPath + tmpFileName;
    }
};