// Helpers file to help various tasks

const crypto = require('crypto')
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

module.exports = helpers