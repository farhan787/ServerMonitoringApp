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
// @TODO Only let the authenticated user access their data or object, don't let them access anyone's else
handlers._users.get = function(data, callback) {
    // Check that phone number is valid
    var phone = typeof(data.queryString.phone) == 'string' && data.queryString.phone.trim().length == 10 ? data.queryString.phone.trim() : false
    if(phone) {
        _data.read('users', phone, (err, data) => {
            if(!err && data) {
                // Remove the hashed password before sending returning it to the user
                delete data.hashedPassword
                callback(200, data)
            } else 
                callback(404, {'Error': 'User doesn\'t exist'})
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (atleast 1 must be specified)
// @TODO Only let the authenticated user update their data or object, don't let them update anyone's else
handlers._users.put = function(data, callback) {

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    if(phone && (firstName || lastName || password)) {
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
        callback(400, {'Error': 'Missing required field'})
}

// Users - delete
// Required data: phone
// Optional data: none
// @TODO Only let the authenticated user delete their data or object, don't let them delete anyone's else
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data, callback) {
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    if(phone) {
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
        callback(400, {'Error': 'Missing required fields'})
}


// Not found handler
handlers.notFound = (data, callback) => {
    callback(400)
}

module.exports = handlers