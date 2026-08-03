function dispatchAction(request) {
  var validationError = validateRequest(request)

  if (validationError) {
    return failure('INVALID_REQUEST', validationError)
  }

  switch (request.action) {
    case 'register':
      return registerParticipant(request.payload)
    case 'getParticipant':
      return getParticipant(request.payload)
    case 'syncSelections':
      return syncSelections(request.payload)
    case 'getDayStatus':
      return failure('NOT_IMPLEMENTED', 'The ' + request.action + ' action is not implemented yet.')
    default:
      return failure('UNKNOWN_ACTION', 'Unsupported action: ' + request.action + '.')
  }
}
