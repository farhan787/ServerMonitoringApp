const http = require('http')
const url = require('url')
var StringDecoder = require('string_decoder').StringDecoder

const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
    
    // parsing the url
    var parsedUrl = url.parse(req.url, true)
    console.log(parsedUrl)
    
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
    req.on('data', data => {
        buffer += decoder.write(data)
    })

    req.on('end', () => {
        buffer += decoder.end()

        res.end("Hello, world\n")
        console.log(`Request path: ${trimmedPath}`)
        console.log(`Method: ${method}`)
        console.log(`Payload: ${buffer}`)
        // console.log(header)
        // console.log(queryStringObject)
    })
    
})

server.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
