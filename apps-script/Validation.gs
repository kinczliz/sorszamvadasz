function validateRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return 'The request body must be a JSON object.'
  }

  var missingFields = getMissingRequiredFields(request, ['action', 'environment'])

  if (missingFields.length > 0) {
    return 'Missing required field: ' + missingFields[0] + '.'
  }

  return null
}

function getMissingRequiredFields(value, fields) {
  return fields.filter(function (field) {
    return value[field] === undefined || value[field] === null || value[field] === ''
  })
}
