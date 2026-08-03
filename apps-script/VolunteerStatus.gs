function setVolunteerStatus(payload) {
  info('Volunteer status change started.')
  var validation = validateVolunteerStatus_(payload)

  if (validation.error) {
    warn('Volunteer status change rejected: ' + validation.error.code)
    return failure(validation.error.code, validation.error.message)
  }

  try {
    var dayStates = loadDayStates(ensureDayStatesSheet(), validation.environment)

    if (dayStates[validation.date] === 'FINISHED') {
      warn('Volunteer status change rejected: DAY_FINISHED')
      return failure('DAY_FINISHED', 'Volunteer status cannot be changed for a finished day.')
    }

    var lock = LockService.getScriptLock()
    lock.waitLock(Config.REGISTRATION_LOCK_TIMEOUT_MS)

    try {
      var usersSheet = getUsersSheet()
      var user = usersSheet && findParticipant(usersSheet, validation.environment, validation.userId)

      if (!user) {
        warn('Volunteer status change rejected for an unknown user.')
        return failure('USER_NOT_FOUND', 'User identifier is not recognized.')
      }

      var volunteersSheet = getVolunteersSheet()
      var record = volunteersSheet && findVolunteerRecord_(volunteersSheet, validation.environment, validation.userId, validation.date)
      var now = new Date().toISOString()

      if (!record && !validation.active) {
        info('Volunteer withdrawal succeeded.')
        return success({ date: validation.date, active: false, updatedAt: now })
      }

      volunteersSheet = volunteersSheet || ensureVolunteersSheet()

      if (record) {
        volunteersSheet.getRange(record.rowIndex, 5, 1, 3).setValues([[validation.active, record.createdAt, now]])
      } else {
        volunteersSheet.appendRow([Utilities.getUuid(), validation.userId, validation.environment, validation.date, true, now, now])
      }

      info(validation.active ? 'Volunteer signup succeeded.' : 'Volunteer withdrawal succeeded.')
      return success({ date: validation.date, active: validation.active, updatedAt: now })
    } finally {
      lock.releaseLock()
    }
  } catch (exception) {
    error('Volunteer status change failed operationally.')
    logUnexpectedFailure('setVolunteerStatus', exception)
    return failure('SERVER_ERROR', 'Volunteer status could not be updated.')
  }
}

function validateVolunteerStatus_(payload) {
  var missingFields = getMissingRequiredFields(payload, ['environment', 'userId', 'date', 'active'])

  if (missingFields.length > 0) return volunteerStatusError_('INVALID_REQUEST', 'Missing required field: ' + missingFields[0] + '.')
  if (payload.environment !== Config.ENV_LIVE && payload.environment !== Config.ENV_DEMO) return volunteerStatusError_('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  if (!isUuid(payload.userId)) return volunteerStatusError_('INVALID_REQUEST', 'User identifier must be a valid UUID.')
  if (Config.FESTIVAL_DATES_2026.indexOf(payload.date) === -1) return volunteerStatusError_('INVALID_REQUEST', 'Date must be an official festival day.')
  if (typeof payload.active !== 'boolean') return volunteerStatusError_('INVALID_REQUEST', 'Active must be a boolean.')

  return { environment: payload.environment, userId: payload.userId.toLowerCase(), date: payload.date, active: payload.active }
}

function findVolunteerRecord_(sheet, environment, userId, date) {
  if (sheet.getLastRow() < 2) return null

  var record = null
  sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.VOLUNTEERS_HEADERS.length).getValues().forEach(function (row, index) {
    if (row[1] === userId && row[2] === environment && formatDayStateDate_(row[3]) === date) {
      if (record) throw new Error('Volunteer data is duplicated.')
      record = { rowIndex: index + 2, createdAt: row[5] }
    }
  })
  return record
}

function loadActiveVolunteerDays(sheet, environment, userId) {
  if (!sheet || sheet.getLastRow() < 2) return []

  var activeDays = {}
  sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.VOLUNTEERS_HEADERS.length).getValues().forEach(function (row) {
    if (row[1] !== userId || row[2] !== environment) return
    var date = formatDayStateDate_(row[3])
    if (Config.FESTIVAL_DATES_2026.indexOf(date) === -1 || typeof row[4] !== 'boolean' || activeDays[date] !== undefined) throw new Error('Volunteer data is invalid.')
    activeDays[date] = row[4]
  })

  return Config.FESTIVAL_DATES_2026.filter(function (date) { return activeDays[date] === true })
}

function volunteerStatusError_(code, message) {
  return { error: { code: code, message: message } }
}
