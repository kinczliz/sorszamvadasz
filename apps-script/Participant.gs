function getParticipant(payload) {
  info('Participant lookup started.')

  var validation = validateParticipantRequest(payload)

  if (validation.error) {
    warn('Participant lookup request is invalid: ' + validation.error.code)
    return failure(validation.error.code, validation.error.message)
  }

  try {
    var usersSheet = getUsersSheet()
    var user = usersSheet && findParticipant(usersSheet, validation.environment, validation.userId)

    if (!user) {
      warn('Unknown participant requested.')
      return failure('USER_NOT_FOUND', 'User identifier is not recognized.')
    }

    var selections = loadParticipantSelections(getSelectionsSheet(), validation.environment, validation.userId)
    var dayStates = loadDayStates(ensureDayStatesSheet(), validation.environment)
    var now = new Date().toISOString()

    usersSheet.getRange(user.rowIndex, Config.USERS_HEADERS.indexOf('lastSeen') + 1).setValue(now)

    info('Participant lookup succeeded.')
    return success({
      user: { id: user.id, displayName: user.displayName },
      selections: selections,
      dayStates: dayStates,
      serverTime: now,
    })
  } catch (exception) {
    error('Participant lookup failed operationally.')
    return failure('SERVER_ERROR', 'Participant state could not be loaded.')
  }
}

function validateParticipantRequest(payload) {
  var missingFields = getMissingRequiredFields(payload, ['environment', 'userId'])

  if (missingFields.length > 0) {
    return participantError_('INVALID_REQUEST', 'Missing required field: ' + missingFields[0] + '.')
  }

  if (payload.environment !== Config.ENV_LIVE && payload.environment !== Config.ENV_DEMO) {
    return participantError_('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  }

  if (!isUuid(payload.userId)) {
    return participantError_('INVALID_REQUEST', 'User identifier must be a valid UUID.')
  }

  return { environment: payload.environment, userId: payload.userId.toLowerCase() }
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function findParticipant(sheet, environment, userId) {
  if (sheet.getLastRow() < 2) {
    return null
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.USERS_HEADERS.length).getValues()

  for (var index = 0; index < rows.length; index += 1) {
    var row = rows[index]

    if (String(row[0]).toLowerCase() === userId && row[1] === environment) {
      return { id: row[0], displayName: row[2], rowIndex: index + 2 }
    }
  }

  return null
}

function loadParticipantSelections(sheet, environment, userId) {
  if (!sheet || sheet.getLastRow() < 2) {
    return {}
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.SELECTIONS_HEADERS.length).getValues()
  var selections = {}

  rows.forEach(function (row) {
    if (row[1] !== userId || row[2] !== environment) {
      return
    }

    if (typeof row[3] !== 'string' || (row[4] !== 'WANT' && row[4] !== 'IF_AVAILABLE') || selections[row[3]]) {
      error('Participant selections are invalid.')
      throw new Error('Participant selections are invalid.')
    }

    selections[row[3]] = row[4]
  })

  return selections
}

function loadDayStates(sheet, environment) {
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.DAY_STATES_HEADERS.length).getValues()
  var dayStates = {}

  rows.forEach(function (row) {
    if (row[0] !== environment) {
      return
    }

    var date = formatDayStateDate_(row[1])

    if (Config.FESTIVAL_DATES_2026.indexOf(date) === -1 || !Config.DAY_STATE_VALUES.includes(row[2]) || dayStates[date]) {
      error('Day state data is invalid.')
      throw new Error('Day state data is invalid.')
    }

    dayStates[date] = row[2]
  })

  if (Object.keys(dayStates).length !== Config.FESTIVAL_DATES_2026.length) {
    error('Day state data is incomplete.')
    throw new Error('Day state data is incomplete.')
  }

  return dayStates
}

function formatDayStateDate_(value) {
  return value instanceof Date
    ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : String(value)
}

function participantError_(code, message) {
  return { error: { code: code, message: message } }
}
