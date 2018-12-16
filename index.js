const http = require('http')
const url = require('url')
var { StringDecoder } = require('string_decoder')
const https = require('https')
const fs = require('fs')

const config = require('./config.js')
const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')

// @TODO GET RID OF THIS
helpers.sendTwilioSms('phone_Number_To_Send_SMS', "Hello from my project...Nice to meet you..", err => {
    console.log(err)
})

// Instantiate the http server
const httpServer = http.createServer(function(req, res) {
    unifiedServer(req, res)
})

httpServer.listen(config.httpPort, () => {
    console.log(`Listening on port ${config.httpPort} in ${config.envName} mode...`)
})

// Instantiate the http server
var httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem') 
}

const httpsServer = https.createServer(httpsServerOptions, function(req, res) {
    unifiedServer(req, res)
})

httpsServer.listen(config.httpsPort, () => {
    console.log(`Listening on port ${config.httpsPort} in ${config.envName} mode...`)
})


// All the server logic for both http and https
var unifiedServer = function(req, res) {
    // parsing the url
    var parsedUrl = url.parse(req.url, true)

    var path = parsedUrl.pathname
    var trimmedPath = path.replace(/^\/+|\/+$/g, '')

    // get the queryString as an object
    var queryString = parsedUrl.query

    // get the headers as an object
    var headers = req.headers

    // get the http method
    var method = req.method.toLowerCase()

    // get the payload if there any
    var decoder = new StringDecoder('utf8')
    var buffer = ''

    // payloads come within a data stream, so we've to extract the payload from data stream

    // emitting an event on getting data
    req.on('data', data => {
        buffer += decoder.write(data)
    })

    // terminating that event when we get the end of the data stream
    req.on('end', function() {
        buffer += decoder.end()

        // Choose the handler, this request should go to 
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound

        // Construct the data object to send to the handler
        var data = {
            trimmedPath,
            queryString,
            method,
            headers,
            'payload': helpers.parseJsonToObject(buffer)
        }

        // Route the request to the handler specified in the router
        chosenHandler(data, function(statusCode, payload) {
            // use the status code callback by the handler, or default status code 200
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200

            // use the payload callback by the handler, or default to an empty object
            payload = typeof(payload) === 'object' ? payload : {}

            // convert the payload into string
            var payloadString = JSON.stringify(payload)

            // return the response

            // returning the response in the form of json
            res.setHeader('Content-Type', 'application/json')
            
            res.writeHead(statusCode)
            res.end(payloadString)

            console.log('Returning this response: ' + statusCode, payloadString)
        })

    }) 
}

// Define a request router
var router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
}