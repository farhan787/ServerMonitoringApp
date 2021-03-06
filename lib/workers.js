// Workers related tasks

const _data = require('./data');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const url = require('url');

// Instantiate the workers object
const workers = {};

// Timer to execute workers-process once per minute
workers.loop = function () {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 10);
};

// Lookup all the checks, get their data, send to a validator
workers.gatherAllChecks = function () {
  // Get all the checks that exists in the system
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else console.log("Error reading one of the check's data");
        });
      });
    }
    // since it's a background worker nothing is calling it, that's why no callback is passed and we are logging the error message
    else console.log('Error: Could not find any checks to process');
  });
};

// Sanity-check the check-data
workers.validateCheckData = function (originalCheckData) {
  originalCheckData =
    typeof originalCheckData == 'object' && originalCheckData !== null
      ? originalCheckData
      : {};

  originalCheckData.id =
    typeof originalCheckData.id == 'string' &&
    originalCheckData.id.trim().length == 20
      ? originalCheckData.id.trim()
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone == 'string' &&
    originalCheckData.userPhone.trim().length == 10
      ? originalCheckData.userPhone
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol == 'string' &&
    ['http', 'https'].indexOf(originalCheckData.protocol) > -1
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url == 'string' &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;
  originalCheckData.method =
    typeof originalCheckData.method == 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1
      ? originalCheckData.method
      : false;
  originalCheckData.successCodes =
    typeof originalCheckData.successCodes == 'object' &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds == 'number' &&
    originalCheckData.timeoutSeconds % 1 == 0 &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // Set the keys that may not be set (if the workers have never seen this check before)
  originalCheckData.state =
    typeof originalCheckData.state == 'string' &&
    ['up', 'down'].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : 'down';
  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked == 'number' &&
    originalCheckData.lastChecked % 1 == 0 &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else
    console.log(
      'Error: One of the checks is not properly formatted. Skipping it..'
    );
};

// Perform the check, send the original checkData and the outcome of the check process to the next step in the process
workers.performCheck = function (originalCheckData) {
  // Prepare the initial check outcome
  var checkOutcome = {
    error: false,
    responseCode: false,
  };

  // Mark that the outcome has not been set yet
  var outcomeSent = false;

  // Parse the hostname and the path of the original check data
  var parsedUrl = url.parse(
    originalCheckData.protocol + '://' + originalCheckData.url,
    true
  );
  var hostName = parsedUrl.hostname;
  var path = parsedUrl.path; // using "path" and not "pathname" because we want the query string

  // Construct the request
  var requestDetails = {
    protocol: originalCheckData.protocol + ':',
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  // Instantiate the request object using either the http or https module
  var _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  var req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent reqest
    var status = res.statusCode;

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', (err) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: err,
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on('timeout', () => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
  // Decide if the check is considered up or down
  var state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? 'up'
      : 'down';

  // Decide if an alert is wanted
  var alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else console.log('Check outcome has not changed, no alert needed');
    } else console.log('Error trying to save updates to one of the checks');
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function (newCheckData) {
  var msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
    if (!err)
      console.log(
        'Success!! User was alerted to a status change in their check via SMS:\n' +
          msg
      );
    else
      console.log(
        'Error: Could not send SMS alert to the user who had a state change in their check\n',
        err
      );
  });
};

// Init script
workers.init = function () {
  // Execute all the checks
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();
};

// Export the workers object
module.exports = workers;
