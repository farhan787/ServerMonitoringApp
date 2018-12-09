const http = require('http')
const url = require('url')
var StringDecoder = require('string_decoder').StringDecoder

const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
    
    // parsing the url
    var parsedUrl = url.parse(req.url, true)
    
    var path = parsedUrl.pathname
    var trimmedPath = path.replace(/^\/+|\/+$/g, '')

    // get the queryString as an object
    var queryStringObject = parsedUrl.query

    // get the headers as an object
    var header = req.headers

    // get the http method
    var method = req.method

    // get the payload if there any
    var decoder = new StringDecoder('utf-8')
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
            'trimmedPath': trimmedPath,
            'queryString': queryStringObject,
            'method': method,
            'headers': header,
            'payload': buffer
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
            res.writeHead(statusCode)
            res.end(payloadString)

            console.log('Returning this response: ' + statusCode, payloadString)
        })

    })    
})


server.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

// Handlers

var handlers = {}

handlers.sample = (data, callback) => {
    // callback a https status code, and a payload object
    callback(406, {'name': 'sample handler'})
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(400)
}

// Define a request router
var router = {
    'sample': handlers.sample
}