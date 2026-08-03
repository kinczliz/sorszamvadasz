function getProgrammeRequestors(payload) {
  info('Programme requestor lookup started.')

  try {
    var validation = validateProgrammeRequestorsRequest_(payload)

    if (validation.error) {
      warn('Programme requestor lookup rejected: ' + validation.error.code)
      return failure(validation.error.code, validation.error.message)
    }

    var expectedAccessCode = PropertiesService.getScriptProperties().getProperty('VOLUNTEER_ACCESS_CODE')

    if (!expectedAccessCode || validation.accessCode !== expectedAccessCode) {
      warn('Programme requestor lookup access denied.')
      return failure('ACCESS_DENIED', 'Volunteer access is not authorized.')
    }

    var requestors = loadProgrammeRequestors_(validation.environment, validation.programmeId)
    info('Programme requestor lookup succeeded.')
    return success({
      programmeId: validation.programmeId,
      want: requestors.want,
      ifAvailable: requestors.ifAvailable,
      serverTime: new Date().toISOString(),
    })
  } catch (exception) {
    error('Programme requestor lookup failed operationally.')
    logUnexpectedFailure('getProgrammeRequestors', exception)
    return failure('SERVER_ERROR', 'Programme requestors could not be loaded.')
  }
}

function validateProgrammeRequestorsRequest_(payload) {
  var missingFields = getMissingRequiredFields(payload, ['environment', 'programmeId'])

  if (missingFields.length > 0) {
    return programmeRequestorsError_('INVALID_REQUEST', 'Missing required field: ' + missingFields[0] + '.')
  }

  if (payload.environment !== Config.ENV_LIVE && payload.environment !== Config.ENV_DEMO) {
    return programmeRequestorsError_('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  }

  if (typeof payload.programmeId !== 'string' || !getProgrammeDays()[payload.programmeId]) {
    return programmeRequestorsError_('PROGRAMME_NOT_FOUND', 'Programme identifier is not recognized.')
  }

  return {
    environment: payload.environment,
    programmeId: payload.programmeId,
    accessCode: typeof payload.accessCode === 'string' ? payload.accessCode : null,
  }
}

function loadProgrammeRequestors_(environment, programmeId) {
  var selectionsSheet = getSelectionsSheet()

  if (!selectionsSheet || selectionsSheet.getLastRow() < 2) {
    return { want: [], ifAvailable: [] }
  }

  var requestorsByUserId = {}
  var selectionRows = selectionsSheet.getRange(2, 1, selectionsSheet.getLastRow() - 1, Config.SELECTIONS_HEADERS.length).getValues()

  selectionRows.forEach(function (row) {
    if (row[2] !== environment || row[3] !== programmeId) return

    var userId = typeof row[1] === 'string' ? row[1].toLowerCase() : ''
    var priority = row[4]
    var requestedAt = requestorTimestamp_(row[6])

    if (!isUuid(userId) || (priority !== 'WANT' && priority !== 'IF_AVAILABLE') || requestedAt === null || requestorsByUserId[userId]) {
      throw new Error('Requestor selection data is invalid.')
    }

    requestorsByUserId[userId] = { priority: priority, requestedAt: requestedAt }
  })

  var userNames = loadRequestorUserNames_(environment, Object.keys(requestorsByUserId))
  var lists = { want: [], ifAvailable: [] }

  Object.keys(requestorsByUserId).forEach(function (userId) {
    var requestor = requestorsByUserId[userId]
    lists[requestor.priority === 'WANT' ? 'want' : 'ifAvailable'].push({
      displayName: userNames[userId],
      requestedAt: requestor.requestedAt,
    })
  })

  return {
    want: sortProgrammeRequestors_(lists.want),
    ifAvailable: sortProgrammeRequestors_(lists.ifAvailable),
  }
}

function loadRequestorUserNames_(environment, userIds) {
  if (userIds.length === 0) return {}

  var usersSheet = getUsersSheet()
  if (!usersSheet || usersSheet.getLastRow() < 2) throw new Error('Requestor user data is invalid.')

  var expectedUserIds = {}
  var userNames = {}
  userIds.forEach(function (userId) { expectedUserIds[userId] = true })

  usersSheet.getRange(2, 1, usersSheet.getLastRow() - 1, Config.USERS_HEADERS.length).getValues().forEach(function (row) {
    var userId = typeof row[0] === 'string' ? row[0].toLowerCase() : ''

    if (row[1] !== environment || !expectedUserIds[userId]) return
    if (userNames[userId] || typeof row[2] !== 'string' || !row[2].trim()) throw new Error('Requestor user data is invalid.')

    userNames[userId] = row[2]
  })

  if (userIds.some(function (userId) { return !userNames[userId] })) {
    throw new Error('Requestor user data is invalid.')
  }

  return userNames
}

function requestorTimestamp_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime()
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))) return Date.parse(value)
  return null
}

function sortProgrammeRequestors_(requestors) {
  return requestors
    .sort(function (first, second) {
      return first.requestedAt - second.requestedAt || first.displayName.localeCompare(second.displayName, 'hu')
    })
    .map(function (requestor) { return { displayName: requestor.displayName } })
}

function programmeRequestorsError_(code, message) {
  return { error: { code: code, message: message } }
}
