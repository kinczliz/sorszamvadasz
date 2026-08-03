function syncSelections(payload) {
  info('Selection synchronization started.')

  try {
    var validation = validateSyncRequest(payload)

    if (validation.error) {
      warn('Selection synchronization rejected: ' + validation.error.code)
      return failure(validation.error.code, validation.error.message)
    }

    var usersSheet = getUsersSheet()
    var knownUser = usersSheet && findParticipant(usersSheet, validation.environment, validation.userId)

    if (!knownUser) {
      warn('Selection synchronization rejected for an unknown user.')
      return failure('USER_NOT_FOUND', 'User identifier is not recognized.')
    }

    var selectionsValidation = validateSyncSelections(payload.selections)

    if (selectionsValidation.error) {
      warn('Selection synchronization rejected: ' + selectionsValidation.error.code)
      return failure(selectionsValidation.error.code, selectionsValidation.error.message)
    }

    validation.selections = selectionsValidation.selections
    validation.programmeDays = selectionsValidation.programmeDays
    var dayStatesSheet = ensureDayStatesSheet()
    var lock = LockService.getScriptLock()
    lock.waitLock(Config.REGISTRATION_LOCK_TIMEOUT_MS)

    try {
      usersSheet = getUsersSheet()
      var user = usersSheet && findParticipant(usersSheet, validation.environment, validation.userId)

      if (!user) {
        warn('Selection synchronization rejected for an unknown user.')
        return failure('USER_NOT_FOUND', 'User identifier is not recognized.')
      }

      var selectionsSheet = ensureSelectionsSheet()
      var currentSelections = loadParticipantSelections(selectionsSheet, validation.environment, validation.userId)
      var changedDays = getChangedDayDates(currentSelections, validation.selections, validation.programmeDays)
      var dayStates = loadDayStates(dayStatesSheet, validation.environment)

      if (changedDays.some(function (date) { return dayStates[date] !== Config.DAY_STATE_OPEN })) {
        warn('Selection synchronization rejected because a day is not open.')
        return failure('DAY_NOT_OPEN', 'Selections for this day are currently locked.')
      }

      var now = new Date().toISOString()

      if (!selectionMapsEqual(currentSelections, validation.selections)) {
        var previousRows = replaceParticipantSelections(selectionsSheet, validation.environment, validation.userId, validation.selections, now)

        try {
          usersSheet.getRange(user.rowIndex, Config.USERS_HEADERS.indexOf('lastSeen') + 1).setValue(now)
        } catch (exception) {
          restoreParticipantSelectionRows_(selectionsSheet, validation.environment, validation.userId, previousRows)
          info('Selection synchronization rollback performed.')
          throw exception
        }
      } else {
        usersSheet.getRange(user.rowIndex, Config.USERS_HEADERS.indexOf('lastSeen') + 1).setValue(now)
      }

      info('Selection synchronization succeeded.')
      return success({ selections: validation.selections, syncedAt: now })
    } finally {
      lock.releaseLock()
    }
  } catch (exception) {
    logUnexpectedFailure('syncSelections', exception)
    return failure('SERVER_ERROR', 'Selections could not be synchronized.')
  }
}

function validateSyncRequest(payload) {
  var missingFields = getMissingRequiredFields(payload, ['environment', 'userId', 'selections'])

  if (missingFields.length > 0) {
    return syncError_('INVALID_REQUEST', 'Missing required field: ' + missingFields[0] + '.')
  }

  if (payload.environment !== Config.ENV_LIVE && payload.environment !== Config.ENV_DEMO) {
    return syncError_('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  }

  if (!isUuid(payload.userId)) {
    return syncError_('INVALID_REQUEST', 'User identifier must be a valid UUID.')
  }

  if (!isPlainObject_(payload.selections)) {
    return syncError_('INVALID_REQUEST', 'Selections must be an object.')
  }

  return {
    environment: payload.environment,
    userId: payload.userId.toLowerCase(),
    selections: payload.selections,
  }
}

function validateSyncSelections(selections) {
  var programmeDays = getProgrammeDays()
  var dailyCounts = {}
  var programmeIds = Object.keys(selections)

  for (var index = 0; index < programmeIds.length; index += 1) {
    var programmeId = programmeIds[index]
    var priority = selections[programmeId]
    var day = programmeDays[programmeId]

    if (!day) {
      return syncError_('PROGRAMME_NOT_FOUND', 'Programme identifier is not recognized.')
    }

    if (priority !== 'WANT' && priority !== 'IF_AVAILABLE') {
      return syncError_('INVALID_PRIORITY', 'Selection priority is not supported.')
    }

    dailyCounts[day] = dailyCounts[day] || { want: 0, ifAvailable: 0 }
    dailyCounts[day][priority === 'WANT' ? 'want' : 'ifAvailable'] += 1

    if (dailyCounts[day].want > Config.MAX_WANT_PER_DAY || dailyCounts[day].ifAvailable > Config.MAX_IF_AVAILABLE_PER_DAY) {
      return syncError_('DAILY_LIMIT_EXCEEDED', 'Submitted selections exceed the configured daily limit.')
    }
  }

  return {
    selections: selections,
    programmeDays: programmeDays,
  }
}

function getChangedDayDates(currentSelections, submittedSelections, programmeDays) {
  var programmeIds = Object.keys(currentSelections)

  Object.keys(submittedSelections).forEach(function (programmeId) {
    if (programmeIds.indexOf(programmeId) === -1) {
      programmeIds.push(programmeId)
    }
  })

  var changedDays = {}

  programmeIds.forEach(function (programmeId) {
    if (currentSelections[programmeId] === submittedSelections[programmeId]) {
      return
    }

    var programmeDay = programmeDays[programmeId]

    if (!programmeDay) {
      return
    }

    var date = Config.PROGRAMME_DAY_DATES_2026[programmeDay]

    if (!date) {
      throw new Error('Programme day is not configured.')
    }

    changedDays[date] = true
  })

  return Object.keys(changedDays)
}

function selectionMapsEqual(first, second) {
  var firstIds = Object.keys(first)
  var secondIds = Object.keys(second)

  return firstIds.length === secondIds.length && firstIds.every(function (programmeId) {
    return first[programmeId] === second[programmeId]
  })
}

function replaceParticipantSelections(sheet, environment, userId, selections, now) {
  var replacementRows = Object.keys(selections).map(function (programmeId) {
    return [Utilities.getUuid(), userId, environment, programmeId, selections[programmeId], now, now]
  })

  return replaceParticipantOwnedRows_(sheet, environment, userId, replacementRows)
}

function restoreParticipantSelectionRows_(sheet, environment, userId, rows) {
  restoreParticipantOwnedRows_(sheet, rows)
}

function isPlainObject_(value) {
  return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]'
}

function syncError_(code, message) {
  return { error: { code: code, message: message } }
}
