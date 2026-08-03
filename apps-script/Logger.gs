function info(message) {
  console.log('[INFO] ' + message)
}

function warn(message) {
  console.log('[WARN] ' + message)
}

function error(message) {
  console.log('[ERROR] ' + message)
}

function logUnexpectedFailure(operation, exception) {
  var errorName = exception && exception.name ? exception.name : 'Error'
  var errorMessage = exception && exception.message ? exception.message : String(exception)
  var stack = exception && exception.stack ? exception.stack : 'Stack trace unavailable.'

  error('operation=' + operation + '; errorName=' + errorName + '; errorMessage=' + errorMessage + '; stack=' + stack)
}

function debug(message) {
  // Enable when request-level diagnostics are needed.
}
