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

  sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.SELECTIONS_HEADERS.length).getValues().forEach(function (row, index) {
    var rowEnvironment = row[2]

    if (rowEnvironment !== environment && (rowEnvironment === Config.ENV_LIVE || rowEnvironment === Config.ENV_DEMO)) {
      return
    }

    var validation = validateSelectionMetricsRow_(row, users, programmeDates, seenSelections)

    if (validation.reason) {
      logInvalidSelectionMetricsRow_(index + 2, row, validation.reason)
      throw new Error('Selection data is invalid.')
    }

    var userId = validation.userId
    var date = validation.date
    var priority = validation.priority
    seenSelections[validation.selectionKey] = true
    dailyCounts[userId] = dailyCounts[userId] || {}
    dailyCounts[userId][date] = dailyCounts[userId][date] || { want: 0, ifAvailable: 0 }
    dailyCounts[userId][date][priority === 'WANT' ? 'want' : 'ifAvailable'] += 1

    if (dailyCounts[userId][date].want > Config.MAX_WANT_PER_DAY || dailyCounts[userId][date].ifAvailable > Config.MAX_IF_AVAILABLE_PER_DAY) {
      logInvalidSelectionMetricsRow_(index + 2, row, 'daily limit exceeded')
      throw new Error('Selection data exceeds the daily limit.')
    }

    counts.programmes[validation.programmeId][priority === 'WANT' ? 'wantCount' : 'ifAvailableCount'] += 1
    counts.days[date][priority === 'WANT' ? 'wantTotal' : 'ifAvailableTotal'] += 1
  })
}

function diagnoseSelectionData() {
  var sheet = getSelectionsSheet()
  var programmeDates = getProgrammeDates_(getProgrammeDays())
  var usersByEnvironment = {}
  usersByEnvironment[Config.ENV_LIVE] = loadMetricsUsers_(getUsersSheet(), Config.ENV_LIVE)
  usersByEnvironment[Config.ENV_DEMO] = loadMetricsUsers_(getUsersSheet(), Config.ENV_DEMO)
  var counts = { valid: 0, invalid: 0 }

  if (!sheet || sheet.getLastRow() < 2) {
    info('Selection data diagnostic: validRows=0; invalidRows=0.')
    return
  }

  var header = sheet.getRange(1, 1, 1, Config.SELECTIONS_HEADERS.length).getValues()[0]
  var schemaMatches = Config.SELECTIONS_HEADERS.every(function (name, index) { return header[index] === name })
  var seenSelectionsByEnvironment = {}
  var dailyCountsByEnvironment = {}
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.SELECTIONS_HEADERS.length).getValues()

  rows.forEach(function (row, index) {
    var environment = row[2]
    var users = usersByEnvironment[environment] || {}
    var seenSelections = seenSelectionsByEnvironment[environment] || {}
    var validation = schemaMatches
      ? validateSelectionMetricsRow_(row, users, programmeDates, seenSelections)
      : { reason: 'schema mismatch' }

    if (validation.reason) {
      counts.invalid += 1
      logInvalidSelectionMetricsRow_(index + 2, row, validation.reason)
      return
    }

    seenSelections[validation.selectionKey] = true
    seenSelectionsByEnvironment[environment] = seenSelections
    var dailyCounts = dailyCountsByEnvironment[environment] || {}
    dailyCounts[validation.userId] = dailyCounts[validation.userId] || {}
    dailyCounts[validation.userId][validation.date] = dailyCounts[validation.userId][validation.date] || { want: 0, ifAvailable: 0 }
    dailyCounts[validation.userId][validation.date][validation.priority === 'WANT' ? 'want' : 'ifAvailable'] += 1
    dailyCountsByEnvironment[environment] = dailyCounts

    if (dailyCounts[validation.userId][validation.date].want > Config.MAX_WANT_PER_DAY || dailyCounts[validation.userId][validation.date].ifAvailable > Config.MAX_IF_AVAILABLE_PER_DAY) {
      counts.invalid += 1
      logInvalidSelectionMetricsRow_(index + 2, row, 'daily limit exceeded')
      return
    }

    counts.valid += 1
  })

  info('Selection data diagnostic: validRows=' + counts.valid + '; invalidRows=' + counts.invalid + '.')
}

function validateSelectionMetricsRow_(row, users, programmeDates, seenSelections) {
  if (!row || row.length !== Config.SELECTIONS_HEADERS.length) return { reason: 'schema mismatch' }
  if ([row[0], row[1], row[2], row[3], row[4], row[5], row[6]].some(function (value) { return value === '' || value === null || value === undefined })) return { reason: 'missing required field' }
  if (row[2] !== Config.ENV_LIVE && row[2] !== Config.ENV_DEMO) return { reason: 'invalid environment' }

  var userId = typeof row[1] === 'string' ? row[1].toLowerCase() : ''
  if (!isUuid(userId)) return { reason: 'malformed user UUID' }
  if (typeof row[3] !== 'string' || !programmeDates[row[3]]) return { reason: 'unknown programme ID' }
  if (row[4] !== 'WANT' && row[4] !== 'IF_AVAILABLE') return { reason: 'invalid priority' }
  if (!isSelectionMetricsTimestamp_(row[5]) || !isSelectionMetricsTimestamp_(row[6])) return { reason: 'malformed timestamp' }
  if (!users[userId]) return { reason: 'orphaned user' }

  var selectionKey = userId + ':' + row[3]
  if (seenSelections[selectionKey]) return { reason: 'duplicate selection' }
  return { userId: userId, programmeId: row[3], priority: row[4], date: programmeDates[row[3]], selectionKey: selectionKey }
}

function isSelectionMetricsTimestamp_(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    || typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))
}

function logInvalidSelectionMetricsRow_(rowNumber, row, reason) {
  error('Selection data invalid: row=' + rowNumber + '; environment=' + (row[2] || 'blank') + '; userId=' + (row[1] || 'blank') + '; programmeId=' + (row[3] || 'blank') + '; priority=' + (row[4] || 'blank') + '; reason=' + reason)
}

function previewDuplicateSelectionRepair() {
  var plan = buildDuplicateSelectionRepairPlan_()
  info('Duplicate selection repair preview: duplicateRows=' + plan.rowIndexes.length + '; retainedRows=' + plan.retainedRows + '.')
}

function applyDuplicateSelectionRepair() {
  var lock = LockService.getScriptLock()
  var locked = false

  try {
    lock.waitLock(Config.METRICS_LOCK_TIMEOUT_MS)
    locked = true
    var plan = buildDuplicateSelectionRepairPlan_()
    info('Duplicate selection repair applying: duplicateRows=' + plan.rowIndexes.length + '; retainedRows=' + plan.retainedRows + '.')

    if (plan.sheet) {
      var snapshot = snapshotParticipantRowsSheet_(plan.sheet)

      try {
        plan.sheet.clearContents()
        plan.sheet.getRange(1, 1, plan.nextRows.length, Config.SELECTIONS_HEADERS.length).setValues(plan.nextRows)
      } catch (exception) {
        restoreParticipantRowsSheet_(plan.sheet, snapshot)
        throw exception
      }
    }

    info('Duplicate selection repair completed: duplicateRowsRemoved=' + plan.rowIndexes.length + '.')
  } finally {
    if (locked) lock.releaseLock()
  }
}

function buildDuplicateSelectionRepairPlan_() {
  var sheet = getSelectionsSheet()
  if (!sheet || sheet.getLastRow() < 2) return { sheet: sheet, rowIndexes: [], retainedRows: 0, nextRows: [Config.SELECTIONS_HEADERS] }

  getParticipantRowsSchema_(sheet)

  var programmeDates = getProgrammeDates_(getProgrammeDays())
  var usersByEnvironment = {}
  usersByEnvironment[Config.ENV_LIVE] = loadMetricsUsers_(getUsersSheet(), Config.ENV_LIVE)
  usersByEnvironment[Config.ENV_DEMO] = loadMetricsUsers_(getUsersSheet(), Config.ENV_DEMO)
  var groups = {}
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.SELECTIONS_HEADERS.length).getValues()

  rows.forEach(function (row, index) {
    var validation = validateSelectionMetricsRow_(row, usersByEnvironment[row[2]] || {}, programmeDates, {})
    if (validation.reason) throw new Error('Duplicate repair aborted: ' + validation.reason + '.')
    var key = row[2] + ':' + validation.selectionKey
    groups[key] = groups[key] || []
    groups[key].push({ row: row, rowIndex: index + 2, validation: validation })
  })

  var rowIndexes = []
  var retainedRows = 0
  Object.keys(groups).forEach(function (key) {
    var entries = groups[key]
    var priorities = {}
    entries.forEach(function (entry) { priorities[entry.row[4]] = true })
    if (Object.keys(priorities).length > 1) throw new Error('Duplicate repair aborted: conflicting priorities.')
    entries.sort(function (first, second) { return selectionTimestampValue_(second.row[6]) - selectionTimestampValue_(first.row[6]) })
    retainedRows += 1
    entries.slice(1).forEach(function (entry) { rowIndexes.push(entry.rowIndex) })
  })

  validateRepairedSelectionLimits_(groups)
  var duplicateRows = {}
  rowIndexes.forEach(function (rowIndex) { duplicateRows[rowIndex] = true })
  var retainedSheetRows = rows.filter(function (row, index) { return !duplicateRows[index + 2] })
  return { sheet: sheet, rowIndexes: rowIndexes.sort(function (a, b) { return a - b }), retainedRows: retainedRows, nextRows: [Config.SELECTIONS_HEADERS].concat(retainedSheetRows) }
}

function selectionTimestampValue_(value) {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}

function validateRepairedSelectionLimits_(groups) {
  var daily = {}
  Object.keys(groups).forEach(function (key) {
    var entry = groups[key].sort(function (first, second) { return selectionTimestampValue_(second.row[6]) - selectionTimestampValue_(first.row[6]) })[0]
    var validation = entry.validation
    var dayKey = entry.row[2] + ':' + validation.userId + ':' + validation.date
    daily[dayKey] = daily[dayKey] || { want: 0, ifAvailable: 0 }
    daily[dayKey][validation.priority === 'WANT' ? 'want' : 'ifAvailable'] += 1
    if (daily[dayKey].want > Config.MAX_WANT_PER_DAY || daily[dayKey].ifAvailable > Config.MAX_IF_AVAILABLE_PER_DAY) throw new Error('Duplicate repair aborted: daily limit exceeded.')
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
