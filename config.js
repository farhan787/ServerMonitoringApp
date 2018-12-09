var environments = {}

// staging default environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging'
}

// production default environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production'    
}

// determine the environment passed in command line
var currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : ''

// check if the passed env in the terminal belongs to one of the keys of environment object if not then default will be staging environment
var envToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments['staging']

module.exports = envToExport;