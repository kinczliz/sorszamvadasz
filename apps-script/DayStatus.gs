function getDayStatus(payload) {
  info('Day-status lookup started.')

  var validation = validateDayStatusRequest(payload)

  if (validation.error) {
    warn('Day-status request is invalid: ' + validation.error.code)
    return failure(validation.error.code, validation.error.message)
  }

  try {
    var dayStates = loadDayStates(ensureDayStatesSheet(), validation.environment)
    var dayMetrics = loadDayMetrics(ensureDayMetricsSheet(), validation.environment)
    var days = Config.FESTIVAL_DATES_2026.map(function (date) {
      var metrics = dayMetrics[date] || emptyDayMetrics_()

      return {
        date: date,
        state: dayStates[date],
        chance: metrics.chance,
        wantCount: metrics.wantTotal,
        ifAvailableCount: metrics.ifAvailableTotal,
        volunteerCount: metrics.volunteerCount,
        capacity: metrics.capacity,
        metricsUpdatedAt: metrics.metricsUpdatedAt,
      }
    })

    info('Day-status lookup succeeded.')
    return success({ days: days, serverTime: new Date().toISOString() })
  } catch (exception) {
    error('Day-status lookup failed operationally.')
    error('operation=getDayStatus; environment=' + validation.environment + '; date=all; validationReason=' + (exception && exception.message ? exception.message : 'Unknown failure'))
    logUnexpectedFailure('getDayStatus', exception)
    return failure('SERVER_ERROR', 'Day status could not be loaded.')
  }
}

function validateDayStatusRequest(payload) {
  var missingFields = getMissingRequiredFields(payload, ['environment'])

  if (missingFields.length > 0) {
    return dayStatusError_('INVALID_REQUEST', 'Missing required field: ' + missingFields[0] + '.')
  }

  if (payload.environment !== Config.ENV_LIVE && payload.environment !== Config.ENV_DEMO) {
    return dayStatusError_('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  }

  return { environment: payload.environment }
}

function loadDayMetrics(sheet, environment) {
  if (sheet.getLastRow() < 2) {
    return {}
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.DAY_METRICS_HEADERS.length).getValues()
  var metricsByDate = {}
  var metricsVersion = null

  rows.forEach(function (row) {
    if (row[0] !== environment) {
      return
    }

    var date = formatDayStateDate_(row[1])
    var metrics = {
      wantTotal: row[2],
      ifAvailableTotal: row[3],
      volunteerCount: row[4],
      capacity: row[5],
      chance: normalizeMetricsChance_(row[6]),
      metricsUpdatedAt: normalizeMetricsTimestamp_(row[7]),
      metricsVersion: normalizeMetricsVersion_(row[8]),
    }

    if (Config.FESTIVAL_DATES_2026.indexOf(date) === -1 || metricsByDate[date] || !isValidDayMetrics_(metrics) || !metrics.metricsVersion || (metricsVersion && metrics.metricsVersion !== metricsVersion)) {
      error('Day metrics are malformed or duplicated.')
      throw new Error('Day metrics are invalid.')
    }

    metricsVersion = metrics.metricsVersion
    metricsByDate[date] = metrics
  })

  return metricsByDate
}

function emptyDayMetrics_() {
  return {
    wantTotal: 0,
    ifAvailableTotal: 0,
    volunteerCount: 0,
    capacity: 0,
    chance: null,
    metricsUpdatedAt: null,
  }
}

function isValidDayMetrics_(metrics) {
  var countsAreValid = [metrics.wantTotal, metrics.ifAvailableTotal, metrics.volunteerCount, metrics.capacity].every(function (value) {
    return Number.isInteger(value) && value >= 0
  })
  var chanceIsValid = metrics.capacity === 0
    ? metrics.chance === null
    : Config.CHANCE_VALUES.indexOf(metrics.chance) !== -1

  return countsAreValid && chanceIsValid && Boolean(metrics.metricsUpdatedAt)
}

function normalizeMetricsChance_(value) {
  return value === '' || value === null || value === undefined ? null : value
}

function normalizeMetricsTimestamp_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))) {
    return value
  }

  return null
}

function normalizeMetricsVersion_(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      return null
    }

    value = String(value)
  }

  if (typeof value !== 'string') {
    return null
  }

  value = value.trim()
  return /^\d{14}$/.test(value) ? value : null
}

function dayStatusError_(code, message) {
  return { error: { code: code, message: message } }
}
