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

module.exports = helpers