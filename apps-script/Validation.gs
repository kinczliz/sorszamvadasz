function validateRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return 'The request body must be a JSON object.'
  }

  var missingFields = getMissingRequiredFields(request, ['action', 'payload'])

  if (missingFields.length > 0) {
    return 'Missing required field: ' + missingFields[0] + '.'
  }

  if (typeof request.action !== 'string' || !request.payload || typeof request.payload !== 'object' || Array.isArray(request.payload)) {
    return 'The request action and payload must be valid.'
  }

  return null
}

function getMissingRequiredFields(value, fields) {
  return fields.filter(function (field) {
    return value[field] === undefined || value[field] === null || value[field] === ''
  })
}
