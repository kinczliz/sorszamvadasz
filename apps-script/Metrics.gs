function publishMetrics() {
  info('Metrics publication started.')

  var lock = LockService.getScriptLock()
  var lockAcquired = false

  try {
    lock.waitLock(Config.METRICS_LOCK_TIMEOUT_MS)
    lockAcquired = true

    var now = new Date().toISOString()
    var version = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss')
    var snapshots = [Config.ENV_LIVE, Config.ENV_DEMO].map(function (environment) {
      return calculateMetricsSnapshot_(environment, now, version)
    })
    var snapshot = combineMetricsSnapshots_(snapshots)
    var programmeMetricsSheet = getProgrammeMetricsSheet() || getOrCreateSheet_(Config.SHEET_PROGRAMME_METRICS, Config.PROGRAMME_METRICS_HEADERS)
    var dayMetricsSheet = getDayMetricsSheet() || getOrCreateSheet_(Config.SHEET_DAY_METRICS, Config.DAY_METRICS_HEADERS)

    publishMetricsSnapshot_(programmeMetricsSheet, dayMetricsSheet, snapshot)
    info('Metrics rows written: ' + (snapshot.programmeRows.length + snapshot.dayRows.length) + '.')
    info('Metrics publication completed.')
  } catch (exception) {
    error('Metrics publication failed unexpectedly.')
    logUnexpectedFailure('publishMetrics', exception)
    throw exception
  } finally {
    if (lockAcquired) {
      lock.releaseLock()
    }
  }
}

function calculateMetricsSnapshot_(environment, now, version) {
  var programmeDays = getProgrammeDays()
  var programmeDates = getProgrammeDates_(programmeDays)
  var users = loadMetricsUsers_(getUsersSheet(), environment)
  var counts = createMetricsCounts_(programmeDates)

  loadDayStates(ensureDayStatesForMetrics_(), environment)
  countSelections_(getSelectionsSheet(), environment, users, programmeDates, counts)
  countVolunteers_(getVolunteersSheet(), environment, users, counts.days)

  var programmeRows = Object.keys(programmeDates).map(function (programmeId) {
    var programme = counts.programmes[programmeId]
    return [environment, programmeId, programme.wantCount, programme.ifAvailableCount, now, version]
  })
  var dayRows = Config.FESTIVAL_DATES_2026.map(function (date) {
    var day = counts.days[date]
    var capacity = day.volunteerCount * Config.TICKETS_PER_VOLUNTEER
    return [environment, date, day.wantTotal, day.ifAvailableTotal, day.volunteerCount, capacity, getChance_(day.wantTotal, capacity), now, version]
  })

  var snapshot = { programmeRows: programmeRows, dayRows: dayRows }
  validateMetricsSnapshot_(snapshot)
  return snapshot
}

function combineMetricsSnapshots_(snapshots) {
  return snapshots.reduce(function (combined, snapshot) {
    return {
      programmeRows: combined.programmeRows.concat(snapshot.programmeRows),
      dayRows: combined.dayRows.concat(snapshot.dayRows),
    }
  }, { programmeRows: [], dayRows: [] })
}

function ensureDayStatesForMetrics_() {
  var sheet = getDayStatesSheet()

  if (sheet) {
    return sheet
  }

  sheet = getOrCreateSheet_(Config.SHEET_DAY_STATES, Config.DAY_STATES_HEADERS)
  var now = new Date().toISOString()
  var rows = []
  var environments = [Config.ENV_LIVE, Config.ENV_DEMO]

  environments.forEach(function (environment) {
    Config.FESTIVAL_DATES_2026.forEach(function (date) {
      rows.push([environment, date, Config.DAY_STATE_OPEN, now])
    })
  })

  sheet.getRange(2, 1, rows.length, Config.DAY_STATES_HEADERS.length).setValues(rows)
  return sheet
}

function getProgrammeDates_(programmeDays) {
  var programmeDates = {}

  Object.keys(programmeDays).forEach(function (programmeId) {
    var date = Config.PROGRAMME_DAY_DATES_2026[programmeDays[programmeId]]

    if (!date) {
      throw new Error('Programme day could not be mapped to a festival date.')
    }

    programmeDates[programmeId] = date
  })

  return programmeDates
}

function createMetricsCounts_(programmeDates) {
  var programmes = {}
  var days = {}

  Object.keys(programmeDates).forEach(function (programmeId) {
    programmes[programmeId] = { wantCount: 0, ifAvailableCount: 0 }
  })
  Config.FESTIVAL_DATES_2026.forEach(function (date) {
    days[date] = { wantTotal: 0, ifAvailableTotal: 0, volunteerCount: 0 }
  })

  return { programmes: programmes, days: days }
}

function loadMetricsUsers_(sheet, environment) {
  var users = {}

  if (!sheet || sheet.getLastRow() < 2) {
    return users
  }

  sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.USERS_HEADERS.length).getValues().forEach(function (row) {
    if (row[1] !== environment) {
      return
    }

    var userId = typeof row[0] === 'string' ? row[0].toLowerCase() : ''

    if (!isUuid(userId) || users[userId]) {
      throw new Error('User data is invalid.')
    }

    users[userId] = true
  })

  return users
}

function countSelections_(sheet, environment, users, programmeDates, counts) {
  if (!sheet || sheet.getLastRow() < 2) {
    return
  }

  var seenSelections = {}
  var dailyCounts = {}

  sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.SELECTIONS_HEADERS.length).getValues().forEach(function (row) {
    if (row[2] !== environment) {
      return
    }

    var userId = typeof row[1] === 'string' ? row[1].toLowerCase() : ''
    var programmeId = row[3]
    var priority = row[4]
    var date = programmeDates[programmeId]
    var selectionKey = userId + ':' + programmeId

    if (!users[userId] || !date || (priority !== 'WANT' && priority !== 'IF_AVAILABLE') || seenSelections[selectionKey]) {
      throw new Error('Selection data is invalid.')
    }

    seenSelections[selectionKey] = true
    dailyCounts[userId] = dailyCounts[userId] || {}
    dailyCounts[userId][date] = dailyCounts[userId][date] || { want: 0, ifAvailable: 0 }
    dailyCounts[userId][date][priority === 'WANT' ? 'want' : 'ifAvailable'] += 1

    if (dailyCounts[userId][date].want > Config.MAX_WANT_PER_DAY || dailyCounts[userId][date].ifAvailable > Config.MAX_IF_AVAILABLE_PER_DAY) {
      throw new Error('Selection data exceeds the daily limit.')
    }

    counts.programmes[programmeId][priority === 'WANT' ? 'wantCount' : 'ifAvailableCount'] += 1
    counts.days[date][priority === 'WANT' ? 'wantTotal' : 'ifAvailableTotal'] += 1
  })
}

function countVolunteers_(sheet, environment, users, days) {
  if (!sheet || sheet.getLastRow() < 2) {
    return
  }

  var volunteerIds = {}

  sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.VOLUNTEERS_HEADERS.length).getValues().forEach(function (row) {
    if (row[2] !== environment) {
      return
    }

    var volunteerId = row[0]
    var userId = typeof row[1] === 'string' ? row[1].toLowerCase() : ''
    var date = formatDayStateDate_(row[3])
    var active = row[4]

    if (typeof volunteerId !== 'string' || !users[userId] || !days[date] || (active !== true && active !== false)) {
      throw new Error('Volunteer data is invalid.')
    }

    if (active) {
      if (volunteerIds[volunteerId]) {
        throw new Error('Volunteer data is duplicated.')
      }

      volunteerIds[volunteerId] = true
      days[date].volunteerCount += 1
    }
  })
}

function getChance_(wantTotal, capacity) {
  if (capacity === 0) {
    return null
  }

  var ratio = wantTotal / capacity

  if (ratio < 1) return 'VERY_GOOD'
  if (ratio < 2) return 'GOOD'
  if (ratio < 3) return 'LOW'
  if (ratio < 4) return 'VERY_LOW'
  return 'HOPELESS'
}

function validateMetricsSnapshot_(snapshot) {
  if (snapshot.programmeRows.length === 0 || snapshot.dayRows.length !== Config.FESTIVAL_DATES_2026.length) {
    throw new Error('Metrics snapshot is incomplete.')
  }

  snapshot.programmeRows.forEach(function (row) {
    if (row.length !== Config.PROGRAMME_METRICS_HEADERS.length || !Number.isInteger(row[2]) || !Number.isInteger(row[3]) || row[2] < 0 || row[3] < 0 || !row[4] || !row[5]) {
      throw new Error('Programme metrics are invalid.')
    }
  })

  snapshot.dayRows.forEach(function (row, index) {
    var metrics = {
      wantTotal: row[2],
      ifAvailableTotal: row[3],
      volunteerCount: row[4],
      capacity: row[5],
      chance: row[6],
      metricsUpdatedAt: row[7],
    }

    if (row.length !== Config.DAY_METRICS_HEADERS.length || row[1] !== Config.FESTIVAL_DATES_2026[index] || !isValidDayMetrics_(metrics) || !row[8]) {
      throw new Error('Day metrics are invalid.')
    }
  })
}

function publishMetricsSnapshot_(programmeSheet, daySheet, snapshot) {
  var programmeBefore = readSheetContents_(programmeSheet)
  var dayBefore = readSheetContents_(daySheet)

  try {
    replaceMetricsRows_(programmeSheet, Config.PROGRAMME_METRICS_HEADERS, snapshot.programmeRows)
    replaceMetricsRows_(daySheet, Config.DAY_METRICS_HEADERS, snapshot.dayRows)
    SpreadsheetApp.flush()
  } catch (exception) {
    try {
      restoreSheetContents_(programmeSheet, programmeBefore)
      restoreSheetContents_(daySheet, dayBefore)
      SpreadsheetApp.flush()
      info('Metrics publication rollback performed.')
    } catch (rollbackException) {
      logUnexpectedFailure('publishMetricsRollback', rollbackException)
    }

    throw exception
  }
}

function readSheetContents_(sheet) {
  var lastRow = sheet.getLastRow()
  var lastColumn = sheet.getLastColumn()
  return lastRow > 0 && lastColumn > 0 ? sheet.getRange(1, 1, lastRow, lastColumn).getValues() : []
}

function replaceMetricsRows_(sheet, headers, rows) {
  var nextRows = [headers].concat(rows)

  sheet.clearContents()
  sheet.getRange(1, 1, nextRows.length, headers.length).setValues(nextRows)
}

function restoreSheetContents_(sheet, rows) {
  sheet.clearContents()

  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows)
  }
}
