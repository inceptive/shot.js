/**
 * @public
 * @class Shot
 * @author Aron Homberg <info@aron-homberg.de>
 *
 * Main class for application startup and execution mode evaluation.
 * Also prints the help message and requires required external libs.
 */
var Shot = {


    /**
     * @protected
     * @var {Number} _defaultNetworkTimeout Default network timeout in ms (3 sec)
     */
    _defaultNetworkTimeout: 3000,


    /**
     * @public
     *
     * Initializes the chartshot.js app by
     *
     * @return {Number} Return code
     */
    init: function(cliArgs) {

        // Require libs
        this.requireLibs();

        // Evaluate execution mode
        var mode = cliArgs[0];

        if (mode === 'camera' && cliArgs.length === 5) {

            var url = cliArgs[1],
                outputFile = cliArgs[2],
                renderDelay = parseInt(cliArgs[3]);
                networkTimeout = parseInt(cliArgs[4]);

            // Directly take a website photo
            Shot.Camera.takePhoto(url, outputFile, renderDelay, networkTimeout);

        } else if (mode === 'webservice' && cliArgs.length === 3) {

            var port = cliArgs[1],
                apiKey = cliArgs[2];

            // Start the restful HTTP webservice
            Shot.WebService.listen(port, apiKey);

        } else {

            // Print help
            this.printHelp();
        }
    },


    /**
     * @protected
     *
     * Prints the help message
     *
     * @return void
     */
    printHelp: function() {

        console.log('Shot.js - v. 0.4, by Aron Homberg, Inceptive');
        console.log('');
        console.log('To render a single image per run:');
        console.log('');
        console.log('Usage: phantom Shot.js camera $url $outputFile $renderDelayInMilliSeconds $networkTimeout');
        console.log('e.g.: phantom Shot.js camera http://www.web.de web.png 500 4500');
        console.log('Attention: Supported file formats are: PNG, JPG, PDF');
        console.log('');
        console.log('Execute in webservice mode: ');
        console.log('[EXPERIMENTAL, ITS SYNCHRONOUS BECAUSE OF PHANTOM.JS LIMITATIONS]');
        console.log('');
        console.log('Usage: phantom Shot.js webservice $port $apiKey');
        console.log('e.g.: phantom Shot.js webservice 4445 yourSecretSalt');
        console.log('');
        console.log('To test the webservice:');
        console.log('e.g.: curl "http://localhost:4445?url=http://www.web.de&renderDelay=500&timeout=4500&apiKey=yourSecretSalt"');
        console.log('Output: Processing...');
        console.log('');
        console.log('...some time ago (4 seconds)...');
        console.log('');
        console.log('again: curl "http://localhost:4445?url=http://www.web.de&renderDelay=500&timeout=4500&apiKey=yourSecretSalt"');
        console.log('Output: [PATH TO RENDERED PNG FILE]');
        console.log('');
        console.log('--- You can also use a browser :o)');

        // Exit with error code
        phantom.exit(1);
    },


    /**
     * Requires the local library files like Camera and WebService
     * @return void
     */
    requireLibs: function() {

        phantom.injectJs('lib/Camera.js');
        phantom.injectJs('lib/WebService.js');
    }
};

// Initialize the app using it's CLI arguments
Shot.init(phantom.args);