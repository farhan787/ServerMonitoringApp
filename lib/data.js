// Library for storing and editing data

const fs = require('fs')
const path = require('path')

const helpers = require('./helpers')

// Container for the module
var lib = {}

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '../.data/')

// Write data to a file
lib.create = function(dir, file, data, callback) {
    // Open the file for writing
    let filePath = lib.baseDir + dir + '/' + file + '.json'
    fs.open(filePath, 'wx', function(err, fileDescriptor) {
        if(!err && fileDescriptor) {
            // Convert data to string
            var stringData = JSON.stringify(data)

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, function(err) {
                if(!err) {
                    fs.close(fileDescriptor, err => {
                        if(!err) {
                            callback(false)
                        } else {
                            callback('Error closing new file.')
                        }
                    })
                } else {
                    callback('Error writing to new file.')
                }
            })

        } else {
            callback('Could not create new file, it may already exist')
        }
    })
}

// Read the data of a file
lib.read = function(dir, file, callback) {
    let filePath = lib.baseDir + dir + '/' + file + '.json'
    fs.readFile(filePath, 'utf8', (err, data) => {
        if(!err && data) {
            var parsedData = helpers.parseJsonToObject(data)
            callback(false, parsedData)
        } else 
            callback(err, data)
    })
}

// Update the data of a file
lib.update = function(dir, file, data, callback) {
    let filePath = lib.baseDir + dir + '/' + file + '.json'
    fs.open(filePath, 'r+', function(err, fileDescriptor) {
        if(!err && fileDescriptor) {
            // Convert the data into string
            var stringData = JSON.stringify(data)

            // Truncate the content of the file
            fs.ftruncate(fileDescriptor, err => {
                if(!err) {
                    // Write to the file for updation             
                    fs.writeFile(fileDescriptor, stringData, err => {
                        if(!err) {
                            fs.close(fileDescriptor, err => {
                                if(!err)
                                    callback(false)
                                else
                                    callback('Error closing the file while updating')
                            })
                        }
                        else
                            callback('Error writing to the file while updating')
                    })               
                } else 
                    callback('Error truncating file')  
            })

        } else {
            callback('Could not open the file for updating, it may not exist yet')            
        }
    })
}

// Delete a file
lib.delete = function(dir, file, callback) {
    let filePath = lib.baseDir + dir + '/' + file + '.json'

    // Unlinking the file, removing the file from file system
    fs.unlink(filePath, err => {
        if(!err) 
            callback(false)
        else
            callback('Can\'t delete this file or it may be already deleted')
    })
}

// List the items in a directory
lib.list = function(dir, callback) {
    let dirPath = lib.baseDir + dir + '/'

    fs.readdir(dirPath, (err, data) => {
        if(!err && data && data.length > 0) {
            var trimmedFileNames = []
            data.forEach(fileName => {
                trimmedFileNames.push(fileName.replace('.json', ''))
            })   
            callback(false, trimmedFileNames)
        } else
            callback(err, data)
    })
}

// Export the module
module.exports = lib