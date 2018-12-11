const _data = require('./data')
const helpers = require('./helpers')

// Handlers
var handlers = {}

handlers.ping = (data, callback) => {
    // callback a https status code, and a payload object
    callback(200)
}

handlers.users = (data, callback) => {
    var acceptableMethods = ['get', 'post', 'put', 'delete']

    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else
        callback(405)
}

// Container for the users submethods
handlers._users = {}

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none

handlers._users.post = function(data, callback) {
    // Check that all required fields are filled out
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false

    if(firstName && lastName && phone && password && tosAgreement) {
        // Make sure, user doesn't already exist
        _data.read('users', phone, function(err, data) {
            if(err) {
                // Hash the password
                var hashedPassword = helpers.hash(password)

                if(hashedPassword) {
                    // Create the user object
                    var userObject = {
                        firstName, 
                        lastName, 
                        phone, 
                        hashedPassword,
                        tosAgreement
                    }

                    _data.create('users', phone, userObject, err => {
                        if(!err) 
                            callback(200)
                        else {
                            console.log(err)
                            callback(500, {'Error': 'Could not create the new user'})
                        }
                    })
                } else {
                    callback(500, {'Error': 'Could not hash the user\'s password'})
                }

            } else {
                callback(400, {'Error': 'A user with this phone number already exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }

}

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
    // Check that phone number is valid
    var phone = typeof(data.queryString.phone) == 'string' && data.queryString.phone.trim().length == 10 ? data.queryString.phone.trim() : false
    if(phone) {

        // Get the token from the request headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false
        console.log('Header: ', data.headers)        
        console.log(`Token: ${token}`)
        // Verify that the given token from the headers is valid for the phone number
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {
                _data.read('users', phone, (err, data) => {
                    if(!err && data) {
                        // Remove the hashed password before sending returning it to the user
                        delete data.hashedPassword
                        callback(200, data)
                    } else 
                        callback(404, {'Error': 'User doesn\'t exist'})
                })
            } else 
                callback(400, {'Error': 'Missing required token in header or token is invalid'})
        }) 
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (atleast 1 must be specified)
handlers._users.put = function(data, callback) {

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    if(phone && (firstName || lastName || password)) {
        // Get the token from the request headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false

        // Verify that the given token from the headers is valid for the phone number

        handlers.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, (err, userData) => {
                    if(!err && userData) {
                        // Update the fields
                        if(firstName)
                            userData.firstName = firstName
                        if(lastName)
                            userData.lastName = lastName
                        if(password) {
                            userData.hashedPassword = helpers.hash(password)
                        }

                        // Store the new updates
                        _data.update('users', phone, userData, err => {
                            if(!err) {
                                callback(200)
                            } else 
                                callback(500, {'Error': 'Could not update the user'})
                        })

                    } else
                        callback(404, {'Error': 'The specified user doesn\'t exist'})
                })
            } else
            callback(400, {'Error': 'Missing required token in header or token is invalid'})
        })      
    } else 
        callback(400, {'Error': 'Missing required field'})
}

// Users - delete
// Required data: phone
// Optional data: none
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data, callback) {
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    if(phone) {

        // Get the token from the request headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false

        // Verify that the given token from the headers is valid for the phone number

        handlers.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {
                _data.read('users', phone, (err, userData) => {
                    if(!err && userData) {
                        _data.delete('users', phone, err => {
                            if(!err) 
                                callback(200)
                            else
                                callback(500, {'Error': 'Could not delete the user, it may already be deleted'})                    
                        })
                    } else
                        callback(404, {'Error': 'Could not find the specified user'})
                })
            } else 
                callback(400, {'Error': 'Missing required token in header or token is invalid'})
        })
    
    } else
        callback(400, {'Error': 'Missing required fields'})
}

handlers.tokens = function(data, callback) {
    var acceptableMethods = ['get', 'post', 'put', 'delete']

    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback)
    } else
        callback(405)
}

// Container for all the tokens methods
handlers._tokens = {}

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    if(phone && password) {
        // Lookup the user that matches the phone
        _data.read('users', phone, (err, userData) => {
            if(!err && userData) {
                // Hash the password and compare it with the hashed password stored in the user's object
                var hashedPassword = helpers.hash(password)
                if(hashedPassword == userData.hashedPassword) {
                    // If valid, create a new token with a random name. Set expiration data 1 hour in the future
                    var tokenId = helpers.createRandomString(20)
                    var expires = Date.now() + 1000 * 60 * 60

                    var tokenObject = {
                        phone,
                        id: tokenId,
                        expires
                    }

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, err => {
                        if(!err) {
                            callback(200, tokenObject )
                        } else
                            callback(500, {'Error': 'Could not create the new token'})
                    })

                } else
                    callback(401, {'Error': 'Incorrect password'})
            } else
                callback(404, {'Error': 'Could not find the specified user'})
        })
    } else
        callback(400, {'Error': 'Missing required field'})
}

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {
    // Check that the token id is valid
    var id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id : false

    if(id) {
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                callback(200, tokenData )
            } else 
                callback(404, {'Error': 'Could not find the token for the specified token id'})
        })
    } else 
        callback(400, {'Error': 'Missing token id inside query string'})

}

// Tokens - put
// Required data: id, extend (to extend the expiry time)
// Optional data: none
handlers._tokens.put = function(data, callback) {
    var id  = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false

    if(id && extend) {
        // Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                // Check to make sure the token isn't already expired
                if(tokenData.expires > Date.now()) {
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60

                    // Store the new updates
                    _data.update('tokens', id, tokenData, err => {
                        if(!err) 
                            callback(200, {'Status': 'Token expiration extended successfully'})
                        else
                            callback(500, {'Error': 'Could not update the token expiration'})
                    })
                } else 
                    callback(400, {'Error': 'Token has already expired and cannot be extended'})
            } else
                callback(404, {'Error': 'Token doesn\'t exist'})
        })
    } else 
        callback(400, {'Error': 'Missing required fields or fields are invalid'})
}

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {
    var id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id.trim() : false

    if(id) {
        // Check if the token id is valid
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                _data.delete('tokens', id, err => {
                    if(!err) {
                        callback(200, {'Status': 'Deleted Successfully'})
                    } else
                        callback(500, {'Error': 'Could not delete the specified token'})
                })
            } else 
                callback(400, {'Error': 'Invalid token id or token may be already deleted'})
        })
    } else
        callback(400, {'Error': 'Missing token id in the query string'})

}

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData) {
            // Check that the token is for the given user and has not expired
            if(tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true)
            } else 
                callback(false)
        } else
            callback(false)
    })
}


// Not found handler
handlers.notFound = (data, callback) => {
    callback(400, {'Error': 'Endpoint not found'})
}

module.exports = handlers