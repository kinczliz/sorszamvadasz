function dispatchAction(request) {
  var validationError = validateRequest(request)

  if (validationError) {
    return failure('INVALID_REQUEST', validationError)
  }

  switch (request.action) {
    case 'register':
    case 'syncSelections':
    case 'getDayStatus':
    case 'getParticipant':
      return failure('NOT_IMPLEMENTED', 'The ' + request.action + ' action is not implemented yet.')
    default:
      return failure('UNKNOWN_ACTION', 'Unsupported action: ' + request.action + '.')
  }
}
