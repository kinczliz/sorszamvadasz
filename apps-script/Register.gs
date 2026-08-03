function registerParticipant(payload) {
  info('Registration started.')

  try {
    var validation = validateRegistration(payload)

    if (validation.error) {
      warn('Registration validation failed: ' + validation.error.code)
      return failure(validation.error.code, validation.error.message)
    }

    var lock = LockService.getScriptLock()
    lock.waitLock(Config.REGISTRATION_LOCK_TIMEOUT_MS)

    try {
      var usersSheet = ensureUsersSheet()
      var selectionsSheet = ensureSelectionsSheet()

      var existingUser = findRegistrationUser_(usersSheet, validation.environment, validation.registrationId)

      if (existingUser) {
        info('Registration retry succeeded.')
        return success({
          user: { id: existingUser.id, displayName: existingUser.displayName },
          selections: loadParticipantSelections(selectionsSheet, validation.environment, existingUser.id),
          serverTime: new Date().toISOString(),
        })
      }

      if (hasDisplayName(usersSheet, validation.environment, validation.displayNameKey)) {
        warn('Duplicate display name rejected.')
        return failure('DISPLAY_NAME_TAKEN', 'Display name is already in use.')
      }

      var userId = Utilities.getUuid()
      var now = new Date().toISOString()

      try {
        storeInitialSelections(selectionsSheet, userId, validation.environment, validation.selections, now)
        usersSheet.appendRow([
          userId,
          validation.environment,
          validation.displayName,
          validation.displayNameKey,
          now,
          now,
          validation.registrationId,
        ])
      } catch (exception) {
        removeSelectionsForUser(selectionsSheet, userId)
        throw exception
      }

      info('Registration succeeded.')
      return success({
        user: { id: userId, displayName: validation.displayName },
        selections: validation.selections,
        serverTime: now,
      })
    } finally {
      lock.releaseLock()
    }
  } catch (exception) {
    error('Registration failed unexpectedly.')
    return failure('SERVER_ERROR', 'Registration could not be completed.')
  }
}

function validateRegistration(payload) {
  var missingFields = getMissingRequiredFields(payload, ['environment', 'displayName', 'selections', 'registrationId'])

  if (missingFields.length > 0) {
    return registrationError_('INVALID_REQUEST', 'Missing required field: ' + missingFields[0] + '.')
  }

  if (payload.environment !== Config.ENV_LIVE && payload.environment !== Config.ENV_DEMO) {
    return registrationError_('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  }

  var displayName = normalizeDisplayName(payload.displayName)

  if (!displayName || displayName.length > Config.MAX_DISPLAY_NAME_LENGTH) {
    return registrationError_('INVALID_DISPLAY_NAME', 'Display name is empty or invalid.')
  }

  if (!isUuid(payload.registrationId)) {
    return registrationError_('INVALID_REQUEST', 'Registration identifier must be a valid UUID.')
  }

  var selectionsValidation = validateInitialSelections(payload.selections)

  if (selectionsValidation.error) {
    return selectionsValidation
  }

  return {
    environment: payload.environment,
    displayName: displayName,
    displayNameKey: displayName.toLocaleLowerCase('hu-HU'),
    registrationId: payload.registrationId.toLowerCase(),
    selections: selectionsValidation.selections,
  }
}

function findRegistrationUser_(sheet, environment, registrationId) {
  if (sheet.getLastRow() < 2) return null

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.USERS_HEADERS.length).getValues()
  for (var index = 0; index < rows.length; index += 1) {
    var row = rows[index]
    if (row[1] === environment && typeof row[6] === 'string' && row[6].toLowerCase() === registrationId) {
      return { id: row[0], displayName: row[2] }
    }
  }

  return null
}

function normalizeDisplayName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateInitialSelections(selections) {
  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) {
    return registrationError_('INVALID_REQUEST', 'Selections must be an object.')
  }

  var programmeIds = Object.keys(selections)

  if (programmeIds.length === 0) {
    return { selections: {} }
  }

  var programmeDays = getProgrammeDays()
  var dailyCounts = {}

  for (var index = 0; index < programmeIds.length; index += 1) {
    var programmeId = programmeIds[index]
    var priority = selections[programmeId]
    var day = programmeDays[programmeId]

    if (!day) {
      return registrationError_('PROGRAMME_NOT_FOUND', 'Programme identifier is not recognized.')
    }

    if (priority !== 'WANT' && priority !== 'IF_AVAILABLE') {
      return registrationError_('INVALID_PRIORITY', 'Selection priority is not supported.')
    }

    dailyCounts[day] = dailyCounts[day] || { want: 0, ifAvailable: 0 }
    dailyCounts[day][priority === 'WANT' ? 'want' : 'ifAvailable'] += 1

    if (dailyCounts[day].want > Config.MAX_WANT_PER_DAY || dailyCounts[day].ifAvailable > Config.MAX_IF_AVAILABLE_PER_DAY) {
      return registrationError_('DAILY_LIMIT_EXCEEDED', 'Submitted selections exceed the configured daily limit.')
    }
  }

  return { selections: selections }
}

function hasDisplayName(sheet, environment, displayNameKey) {
  if (sheet.getLastRow() < 2) {
    return false
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.USERS_HEADERS.length).getValues()

  return rows.some(function (row) {
    return row[1] === environment && row[3] === displayNameKey
  })
}

function storeInitialSelections(sheet, userId, environment, selections, now) {
  var programmeIds = Object.keys(selections)

  if (programmeIds.length === 0) {
    return
  }

  var rows = programmeIds.map(function (programmeId) {
    return [Utilities.getUuid(), userId, environment, programmeId, selections[programmeId], now, now]
  })

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, Config.SELECTIONS_HEADERS.length).setValues(rows)
}

function removeSelectionsForUser(sheet, userId) {
  for (var row = sheet.getLastRow(); row >= 2; row -= 1) {
    if (sheet.getRange(row, 2).getValue() === userId) {
      sheet.deleteRow(row)
    }
  }
}

function registrationError_(code, message) {
  return { error: { code: code, message: message } }
}
