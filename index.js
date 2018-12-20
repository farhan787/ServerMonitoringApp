const server = require('./lib/server')
const workers = require('./lib/workers')

// Declare the app
const app = {}

app.init = function() {
    // Start the server
    server.init()
    
    // Start the background workers
    workers.init()
}

// Execute
app.init()

// Export the app
module.exports = app