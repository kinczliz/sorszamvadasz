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
      return getDayStatus(request.payload)
    case 'getVolunteerOverview':
      return getVolunteerOverview(request.payload)
    case 'setVolunteerStatus':
      return setVolunteerStatus(request.payload)
    case 'getProgrammeRequestors':
      return getProgrammeRequestors(request.payload)
    case 'getAdminOverview': return getAdminOverview(request.payload)
    case 'setDayState': return setDayState(request.payload)
    case 'publishMetricsAdmin': return publishMetricsAdmin(request.payload)
    case 'previewLiveInitialization': return previewLiveInitialization(request.payload)
    case 'initializeLive': return initializeLive(request.payload)
    default:
      return failure('UNKNOWN_ACTION', 'Unsupported action: ' + request.action + '.')
  }
}
