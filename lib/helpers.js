// Helpers file to help various tasks

const crypto = require('crypto')
const querystring = require('querystring')
const https = require('https')
const config = require('../config')

// Helper Container
const helpers = {}

// Create a SHA256 hash
helpers.hash = password => {
    if(typeof(password) === 'string' && password.length > 0) {
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex')
        return hash
    } else 
        return false
}

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = string => {
    try {
        var obj = JSON.parse(string)
        return obj
    } catch(e) {
        return {}
    }
}

helpers.createRandomString = strLength => {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false
    if(strLength) {
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'
        var str = ''

        for(let i = 0; i < strLength; i++) {
            // Get a random character from the possible characters
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))

            // Append this character to the string
            str += randomCharacter
        }

        return str
    } else
        return false
}


// Send a SMS message via Twilio
helpers.sendTwilioSms = function(phone, msg, callback) {
    // Validate parameters
    var phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false
    var msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false

    if(phone && msg) {
        // Configure the request payload for Twilio
        var payload = {
            'From': config.twilio.fromPhone,
            'To': `+91${phone}`,
            'Body':  msg
        }

        // Stringify the payload object  
        var stringPayload = querystring.stringify(payload)

        // Configure the request details
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        }

        // Instantiate the request object
        var req = https.request(requestDetails, res => {
            // Grab the status of the send request
            var status = res.statusCode
            // Callback successfully if the request went through
            if(status == 200 || status == 201)
                callback(false)
            else
                callback('Status code returned was ' + status)
        })

        // Bind to the error event so it doesn't get thrown
        req.on('error', function(err) {
            callback(err)
        })

        // Add the paylaod
        req.write(stringPayload)

        // End the request
        req.end()

    } else
        callback(400, {'Error': 'Given parameters are missing or invalid'})
}

module.exports = helpers