function getVolunteerOverview(payload) {
  info('Volunteer overview lookup started.')

  var validation = validateVolunteerOverviewRequest_(payload)

  if (validation.error) {
    warn('Volunteer overview request is invalid: ' + validation.error.code)
    return failure(validation.error.code, validation.error.message)
  }

  try {
    var overview = loadVolunteerOverviewData_(validation.environment, validation.date, false)

    if (!overview.metrics) {
      info('Volunteer overview lookup succeeded without published metrics.')
    } else {
      info('Volunteer overview lookup succeeded.')
    }

    return volunteerOverviewSuccess_(validation.date, overview.state, overview.metrics, overview.programmes)
  } catch (exception) {
    error('Volunteer overview lookup failed operationally.')
    error('operation=getVolunteerOverview; environment=' + validation.environment + '; date=' + validation.date + '; validationReason=' + (exception && exception.message ? exception.message : 'Unknown failure'))
    logUnexpectedFailure('getVolunteerOverview', exception)
    return failure('SERVER_ERROR', 'Volunteer overview could not be loaded.')
  }
}

function validateVolunteerOverviewRequest_(payload) {
  var missingFields = getMissingRequiredFields(payload, ['environment', 'date'])

  if (missingFields.length > 0) {
    return volunteerOverviewError_('INVALID_REQUEST', 'Missing required field: ' + missingFields[0] + '.')
  }

  if (payload.environment !== Config.ENV_LIVE && payload.environment !== Config.ENV_DEMO) {
    return volunteerOverviewError_('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  }

  if (typeof payload.date !== 'string' || Config.FESTIVAL_DATES_2026.indexOf(payload.date) === -1) {
    return volunteerOverviewError_('INVALID_REQUEST', 'Date must be an official festival day.')
  }

  return { environment: payload.environment, date: payload.date }
}

function testVolunteerOverviewLoading() {
  var environment = Config.ENV_LIVE
  var date = '2026-08-04'
  var overview = loadVolunteerOverviewData_(environment, date, true)

  logVolunteerOverviewDiagnostic_('build response', environment, date, overview.programmes.length, overview.metrics ? overview.metrics.metricsVersion : null)
  return volunteerOverviewSuccess_(date, overview.state, overview.metrics, overview.programmes)
}

function loadVolunteerOverviewData_(environment, date, diagnostic) {
  logVolunteerOverviewDiagnostic_('load active programmes', environment, date, 0, null, diagnostic)
  var programmeDates = getProgrammeDates_(getProgrammeDays())
  var programmeIds = Object.keys(programmeDates).filter(function (programmeId) {
    return programmeDates[programmeId] === date
  })
  logVolunteerOverviewDiagnostic_('load active programmes', environment, date, programmeIds.length, null, diagnostic)

  logVolunteerOverviewDiagnostic_('load DayStates', environment, date, 0, null, diagnostic)
  var dayStates = loadDayStates(ensureDayStatesSheet(), environment)
  logVolunteerOverviewDiagnostic_('load DayStates', environment, date, Object.keys(dayStates).length, null, diagnostic)

  var dayMetrics = loadVolunteerDayMetrics_(getDayMetricsSheet(), environment, date, diagnostic)
  var programmeMetrics = loadVolunteerProgrammeMetrics_(getProgrammeMetricsSheet(), environment, programmeDates, date, diagnostic)

  if (!dayMetrics) {
    logVolunteerOverviewDiagnostic_('validate ProgrammeMetrics snapshot', environment, date, Object.keys(programmeMetrics).length, null, diagnostic)

    if (Object.keys(programmeMetrics).length > 0) {
      throw new Error('Published metrics are incomplete.')
    }

    logVolunteerOverviewDiagnostic_('join programme rows', environment, date, programmeIds.length, null, diagnostic)
    return { state: dayStates[date], metrics: null, programmes: zeroProgrammeMetrics_(programmeIds) }
  }

  var programmeMetricIds = Object.keys(programmeMetrics)
  logVolunteerOverviewDiagnostic_('validate ProgrammeMetrics snapshot', environment, date, programmeMetricIds.length, dayMetrics.metricsVersion, diagnostic)

  if (programmeMetricIds.length !== Object.keys(programmeDates).length || programmeMetricIds.some(function (programmeId) {
    return programmeMetrics[programmeId].metricsVersion !== dayMetrics.metricsVersion
  })) {
    throw new Error('Published programme metrics are incomplete.')
  }

  logVolunteerOverviewDiagnostic_('join programme rows', environment, date, programmeIds.length, dayMetrics.metricsVersion, diagnostic)
  var programmes = programmeIds.map(function (programmeId) {
    var metrics = programmeMetrics[programmeId]

    if (!metrics || metrics.metricsVersion !== dayMetrics.metricsVersion) {
      throw new Error('Published metrics are inconsistent.')
    }

    return {
      programmeId: programmeId,
      wantCount: metrics.wantCount,
      ifAvailableCount: metrics.ifAvailableCount,
    }
  })

  return { state: dayStates[date], metrics: dayMetrics, programmes: programmes }
}

function loadVolunteerDayMetrics_(sheet, environment, date, diagnostic) {
  if (!sheet || sheet.getLastRow() < 2) {
    logVolunteerOverviewDiagnostic_('load DayMetrics', environment, date, 0, null, diagnostic)
    logVolunteerOverviewDiagnostic_('normalize chance', environment, date, 0, null, diagnostic)
    logVolunteerOverviewDiagnostic_('validate DayMetrics snapshot', environment, date, 0, null, diagnostic)
    return null
  }

  var metrics = null
  var metricsByDate = {}
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.DAY_METRICS_HEADERS.length).getValues()
  var environmentRows = rows.filter(function (row) { return row[0] === environment })

  logVolunteerOverviewDiagnostic_('load DayMetrics', environment, date, environmentRows.length, null, diagnostic)
  logVolunteerOverviewDiagnostic_('normalize chance', environment, date, environmentRows.length, null, diagnostic)
  logVolunteerOverviewDiagnostic_('validate DayMetrics snapshot', environment, date, environmentRows.length, rawMetricsVersions_(environmentRows, 8), diagnostic)

  environmentRows.forEach(function (row) {

    var rowDate = formatDayStateDate_(row[1])

    if (Config.FESTIVAL_DATES_2026.indexOf(rowDate) === -1 || metricsByDate[rowDate]) {
      throw new Error('Day metrics are duplicated.')
    }

    var rowMetrics = {
      wantTotal: row[2],
      ifAvailableTotal: row[3],
      volunteerCount: row[4],
      capacity: row[5],
      chance: normalizeMetricsChance_(row[6]),
      metricsUpdatedAt: normalizeMetricsTimestamp_(row[7]),
      metricsVersion: normalizeMetricsVersion_(row[8]),
    }

    if (!rowMetrics.metricsVersion) {
      throw new Error('Day metricsVersion is invalid.')
    }

    if (!isValidDayMetrics_(rowMetrics)) {
      throw new Error('Day metrics are invalid.')
    }

    metricsByDate[rowDate] = rowMetrics

    if (rowDate === date) {
      metrics = rowMetrics
    }
  })

  var versions = Object.keys(metricsByDate).map(function (metricDate) { return metricsByDate[metricDate].metricsVersion }).join(',')
  logVolunteerOverviewDiagnostic_('validate DayMetrics snapshot', environment, date, Object.keys(metricsByDate).length, versions, diagnostic)

  if (!metrics && Object.keys(metricsByDate).length > 0) {
    throw new Error('Day metrics are incomplete.')
  }

  if (metrics && (Object.keys(metricsByDate).length !== Config.FESTIVAL_DATES_2026.length || Object.keys(metricsByDate).some(function (metricDate) {
    return metricsByDate[metricDate].metricsVersion !== metrics.metricsVersion
  }))) {
    throw new Error('Day metrics are inconsistent.')
  }

  return metrics
}

function loadVolunteerProgrammeMetrics_(sheet, environment, programmeDates, date, diagnostic) {
  var metricsByProgrammeId = {}

  if (!sheet || sheet.getLastRow() < 2) {
    logVolunteerOverviewDiagnostic_('load ProgrammeMetrics', environment, date, 0, null, diagnostic)
    return metricsByProgrammeId
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.PROGRAMME_METRICS_HEADERS.length).getValues()
  var environmentRows = rows.filter(function (row) { return row[0] === environment })

  logVolunteerOverviewDiagnostic_('load ProgrammeMetrics', environment, date, environmentRows.length, null, diagnostic)
  logVolunteerOverviewDiagnostic_('validate ProgrammeMetrics snapshot', environment, date, environmentRows.length, rawMetricsVersions_(environmentRows, 5), diagnostic)

  environmentRows.forEach(function (row) {

    var programmeId = row[1]
    var metrics = {
      wantCount: row[2],
      ifAvailableCount: row[3],
      metricsUpdatedAt: normalizeMetricsTimestamp_(row[4]),
      metricsVersion: normalizeMetricsVersion_(row[5]),
    }

    if (!metrics.metricsVersion) {
      throw new Error('Programme metricsVersion is invalid.')
    }

    if (typeof programmeId !== 'string' || !programmeDates[programmeId] || metricsByProgrammeId[programmeId] || !isValidVolunteerProgrammeMetrics_(metrics)) {
      throw new Error('Programme metrics are invalid.')
    }

    metricsByProgrammeId[programmeId] = metrics
  })

  return metricsByProgrammeId
}

function logVolunteerOverviewDiagnostic_(stage, environment, date, rowCount, metricsVersion, enabled) {
  if (!enabled) {
    return
  }

  console.log('[DIAGNOSTIC] stage=' + stage + '; environment=' + environment + '; date=' + date + '; rowCount=' + rowCount + '; metricsVersion=' + (metricsVersion || 'none'))
}

function rawMetricsVersions_(rows, index) {
  return rows.map(function (row) {
    return row[index] === null || row[index] === undefined || row[index] === '' ? 'blank' : String(row[index])
  }).join(',')
}

function isValidVolunteerProgrammeMetrics_(metrics) {
  return Number.isInteger(metrics.wantCount) && metrics.wantCount >= 0
    && Number.isInteger(metrics.ifAvailableCount) && metrics.ifAvailableCount >= 0
    && Boolean(metrics.metricsUpdatedAt) && Boolean(metrics.metricsVersion)
}

function zeroProgrammeMetrics_(programmeIds) {
  return programmeIds.map(function (programmeId) {
    return { programmeId: programmeId, wantCount: 0, ifAvailableCount: 0 }
  })
}

function volunteerOverviewSuccess_(date, state, metrics, programmes) {
  return success({
    date: date,
    state: state,
    volunteerCount: metrics ? metrics.volunteerCount : 0,
    capacity: metrics ? metrics.capacity : 0,
    chance: metrics ? metrics.chance : null,
    metricsUpdatedAt: metrics ? metrics.metricsUpdatedAt : null,
    metricsVersion: metrics ? metrics.metricsVersion : null,
    programmes: programmes,
    serverTime: new Date().toISOString(),
  })
}

function volunteerOverviewError_(code, message) {
  return { error: { code: code, message: message } }
}
