const _data = require('./data')
const helpers = require('./helpers')
const config = require('./config')

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
                            callback(200, {'Status': 'User created successfully!!'})
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
handlers._users.delete = function(data, callback) {
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    if(phone) {
        // Get the token from the request headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false

        // Verify that the given token from the headers is valid for the phone number

        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {
                _data.read('users', phone, (err, userData) => {
                    if(!err && userData) {
                        _data.delete('users', phone, err => {
                            if(!err) {
                                // Delete each of the checks associated with the user
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                var checksToDelete = userChecks.length

                                if(checksToDelete > 0) {
                                    var checksDeleted = 0
                                    var deletionErrors = false

                                    // Loop through the checks
                                    userChecks.forEach( checkId => {
                                        // Delete the check
                                        _data.delete('checks', checkId, err => {
                                            if(err) {
                                                deletionErrors = true
                                            }
                                            checksDeleted++
                                            if(checksDeleted == checksToDelete) {
                                                if(!deletionErrors)
                                                    callback(200, {'Status': 'User and all the information associated with this user has been deleted successfully!!'})
                                                else
                                                    callback(500, {'Error': 'Error is encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully.'})
                                            }
                                        })
                                    })
                                } else
                                    callback(200)
                            }
                            else
                                callback(500, {'Error': 'Could not delete the user, it may already be deleted'})                    
                        })
                    } else
                        callback(404, {'Error': 'Could not find the specified user, check the phone number again or the token does not belong to this phone number'})
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
                    var expires = Date.now() + 1000 * 60 * 60       // token expires in 1 hour

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
            if(tokenData.phone === phone && tokenData.expires > Date.now())
                callback(true)
            else
                callback(false)
        } else
            callback(false)
    })
}


// Checks

handlers.checks = function(data, callback) {
    var acceptableMethods = ['get', 'post', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method > -1)) {
        handlers._checks[data.method](data, callback)
    } else
        callback(405)
}

handlers._checks = {}

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback) {
    // Validate all these inputs
    var protocol = typeof(data.payload.protocol) == 'string' &&  ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    var method = typeof(data.payload.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false 

    if(protocol && url &&  method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ?  data.headers.token : false

        // Lookup the user by reading the token
        _data.read('tokens', token, (err, tokenData) => {
            if(!err && tokenData) {
                var userPhone = tokenData.phone

                // Lookup the user data
                _data.read('users', userPhone, (err, userData) => {
                    if(!err && userData) {
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                        
                        // Verify that the user has less than the number of max-checks-per-user
                        if(userChecks.length < config.maxChecks) {
                            // Create a random id for the check
                            var checkId = helpers.createRandomString(20)

                            // Create the check object and include the user's phone
                            var checkObject = {
                                'id': checkId,
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds
                            }

                            // Save the object
                            _data.create('checks', checkId, checkObject, err => {
                                if(!err) {
                                    // Add the check id to the user's object
                                    userData.checks = userChecks
                                    userData.checks.push(checkId)

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, err => {
                                        if(!err) {
                                            // Return the data about the new check to the requester
                                            callback(200, checkObject)
                                        } else
                                            callback(500, {'Error': 'Could not update the user with the new check'})
                                    })
                                } else 
                                    callback(500, {'Error': 'Could not create the new check'})
                            })

                        } else 
                            callback(400, {'Error': 'The user already has the maximum number of checks ('+config.maxChecks+')'})
                    } else
                        callback(403)
                })

            } else
                callback(401, {'Error': 'Missing token in the headers'})
        })

    } else 
        callback(400, {'Error': 'Missing required inputs or inputs are invalid'})

}

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function(data, callback) {
    var id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id.trim() : false
    if(id) {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData) {
                // Get the token from the headers object
                var token = typeof(data.headers.token) == 'string' ? data.headers.token.trim() : false

                // Verify that the token is valid and belongs to the user  who created the check
                handlers._tokens.verifyToken(token, checkData.userPhone, (isTokenValid) => {
                    if(isTokenValid) {
                        // Return the check data
                        callback(200, checkData)
                    } else 
                        callback(400, {'Error': 'Invalid token'})
                })
            } else
                callback(404, {'Error': 'No check belongs to the specified check id'})
        })
    } else
        callback(400, {'Error': 'Invalid check id in the query string'})
}

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be send)
handlers._checks.put = function(data, callback) {
    var id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id.trim() : false
    var protocol = typeof(data.payload.protocol) == 'string' &&  ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    var method = typeof(data.payload.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false 

    if(id && (protocol || url || method || successCodes || timeoutSeconds)) {
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData) {
                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                // Check that the token is valid
                  
                handlers._tokens.verifyToken(token, checkData.userPhone, isTokenValid => {
                    if(isTokenValid) {
                        if(protocol)
                            checkData.protocol = protocol
                        
                        if(url)
                            checkData.url = url
                        
                        if(method)
                            checkData.method = method
                        
                        if(successCodes)
                            checkData.successCodes = successCodes
                        
                        if(timeoutSeconds)
                            checkData.timeoutSeconds = timeoutSeconds
        
                        // Store the new updates
                        _data.update('checks', id, checkData, err => {
                            if(!err) {
                                callback(200, checkData)
                            } else
                                callback(500, {'Error': 'Could not update the check data of the specified check id'})
                        })
                    } else
                        callback(400, {'Error': 'Token is missing or invalid token'})
                  })
            } else
                callback(400, {'Error': 'Check id did not exist'})
        })
    } else
        callback(400, {'Error': 'Missing required fields'})
}

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data, callback) {
    var id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id.trim() : false

    if(id) {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData) {
                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false

                // Verify the token belongs to the user who created it
                handlers._tokens.verifyToken(token, checkData.userPhone, isTokenValid => {
                    if(isTokenValid) {

                        // Removing the check id from the user's object
                        _data.read('users', checkData.userPhone, (err, userData) => {
                            if(!err && userData) {
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                
                                // check position
                                var checkIndex = userChecks.indexOf(id)

                                if(checkIndex > -1 && checkIndex < config.maxChecks) {
                                    var deletedCheck = userChecks.splice(checkIndex, 1)

                                    // Saving the checks array inside the original checks array
                                    userData.checks = userChecks

                                    // Update the user with the deleted check id inside the checks array
                                    _data.update('users', checkData.userPhone, userData, err => {
                                        if(!err) {
                                            // Delete the check data from the checks itself
                                            _data.delete('checks', id, err => {
                                                if(!err)
                                                    callback(200, {'Status': 'Check having '+deletedCheck+' id has been successfully deleted!!'})
                                                else
                                                    callback(500, {'Error': 'Could not delete the specified check'})
                                            })
                                        } else
                                            callback(500,{'Error' : 'Could not update the user, so could not delete the check'});
                                    })
                                } else
                                    callback(500,{"Error" : "Could not find the position of check inside user\'s object"});    
                            } else
                                callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                        })
                    } else
                        callback(403, {'Error': 'Invalid token or token is expired'})
                })
            } else
          callback(400,{"Error" : "The check ID specified could not be found"});
        })
    } else
      callback(400,{"Error" : "Missing valid check id in the query string"});
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(400, {'Error': 'Endpoint not found'})
}

module.exports = handlers