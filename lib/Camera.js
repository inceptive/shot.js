/**
 * @public
 * @class Shot.Camera
 * @author Aron Homberg <info@aron-homberg.de>
 *
 * Class which renders a bitmap image for a given URL and
 * viewport size.
 */
Shot.Camera = {


    /**
     * @protected
     * @var {phantom.webpage} _page Page reference
     */
    _page: null,


    /**
     * @protected
     * @var {Number} _defaultRenderDelay Default render delay time in ms (0.4 sec)
     */
    _defaultRenderDelay: 400,


    /**
     * @public
     *
     * Takes a photo from a web page, specified by it's url
     * and the targetFile destination. If the method get's called
     * from a webservice instance, it doesn't exit the phantom process
     * after taking the photo.
     *
     * @param {String} url         Page to load
     * @param {String} outputFile  File to persist photo to
     * @param {Number} renderDelay Amout of time to delay the rendering
     *                             action after page is loaded in ms
     * @param {Number} networkTimeout Timeout to wait for DOM ready until cancelling of rendering
     * @param {Function} webServiceCb Webservice callback function
     *
     * @return void
     */
    takePhoto: function(url, outputFile, renderDelay, networkTimeout, webServiceCb) {

        var me = this,
            isWebService = typeof webServiceCb == 'function',
            hasTimedOut = false;

        // If not page instance was created before, create one
        if (this._page === null) {
            this._page = require('webpage').create();
        }

        // Overlay network timeout setting by default value if not set explicitly
        if (networkTimeout === null) {
            networkTimeout = Shot._defaultNetworkTimeout;
        }

        // Register network timeout
        var networkTimeoutRef = setTimeout(function() {

            var errorMessage = 'Rendering request cancelled by timeout. ' +
                               'Took longer than ' + networkTimeout + 'ms.';

            // Write error message to console
            console.debug(errorMessage);

            // If timeout occurs, close network request connection
            // if webservice call or kill the process on cli call.
            if (isWebService) {
                hasTimedOut = true;
                webServiceCb(false, errorMessage);
            } else {
                phantom.exit(1);
            }

        }, networkTimeout);

        // Try to open the web page
        this._page.open(url, function(status) {

            // Unregister network timeout
            clearTimeout(networkTimeoutRef);

            if (hasTimedOut) {
                return;
            }

            // Loading web page was successful
            if (status == 'success') {

                // Call handler function when DOM loading is finished
                me.handleLoadFinished(status, url, outputFile, renderDelay, webServiceCb);
            }

            // Loading web page failed
            if (status == 'fail') {

                errorMessage = 'Loading web page failed. (404, 500, for whetever reason...)';

                // Write error message to console
                console.debug(errorMessage);

                if (isWebService) {
                    webServiceCb(false, errorMessage);
                } else {
                    phantom.exit(1);
                }
            }
        });
    },


    /**
     * @protected
     *
     * Takes a photo when the page's DOM was loaded completely.
     * Afterwards kills the process or releases the web pages
     * heap memory if it's a webservice call.
     *
     * @param {String} status Contains 'success' or 'failed'
     * @param {String} url Page to load
     * @param {String} outputFile File to persist photo to
     * @param {Number} renderDelay Amout of time to delay the rendering
     *                             action after page is loaded in ms
     * @param {Function} webServiceCb Webservice callback function
     *
     * @return void
     */
    handleLoadFinished: function (status, url, outputFile, renderDelay, webServiceCb) {

        // Scope reference variable
        var me = this;

        // Sanitize the render delay and reset to default deplay amount
        renderDelay = parseInt(renderDelay);
        if (typeof renderDelay != 'number' || renderDelay < 0 || renderDelay == 0) {
            renderDelay = this._defaultRenderDelay;
        }

        setTimeout(function () {

            // Render the bitmap to file
            me._page.render(outputFile);

            console.debug('Done.');

            if (typeof webServiceCb == 'function') {

                // Call the webservice callback
                webServiceCb(true);

            } else {

                // In non-webservice mode, exit Shot.js
                phantom.exit();
            }
        }, renderDelay);
    }
};