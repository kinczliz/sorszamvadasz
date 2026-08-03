function getSettingsSheet() {
  return getSheet_(Config.SHEET_SETTINGS)
}

function getUsersSheet() {
  return getSheet_(Config.SHEET_USERS)
}

function getSelectionsSheet() {
  return getSheet_(Config.SHEET_SELECTIONS)
}

function getDayStatesSheet() {
  return getSheet_(Config.SHEET_DAY_STATES)
}

function getVolunteersSheet() {
  return getSheet_(Config.SHEET_VOLUNTEERS)
}

function getAllocationsSheet() {
  return getSheet_(Config.SHEET_ALLOCATIONS)
}

function getDayMetricsSheet() {
  return getSheet_(Config.SHEET_DAY_METRICS)
}

function getProgrammeMetricsSheet() {
  return getSheet_(Config.SHEET_PROGRAMME_METRICS)
}

function ensureUsersSheet() {
  return getOrCreateSheet_(Config.SHEET_USERS, Config.USERS_HEADERS)
}

function ensureSelectionsSheet() {
  return getOrCreateSheet_(Config.SHEET_SELECTIONS, Config.SELECTIONS_HEADERS)
}

function ensureVolunteersSheet() {
  return getOrCreateSheet_(Config.SHEET_VOLUNTEERS, Config.VOLUNTEERS_HEADERS)
}

function ensureDayStatesSheet() {
  var sheet = getDayStatesSheet()

  if (sheet) {
    return sheet
  }

  var lock = LockService.getScriptLock()
  lock.waitLock(Config.DAY_STATE_LOCK_TIMEOUT_MS)

  try {
    sheet = getDayStatesSheet()

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
  } finally {
    lock.releaseLock()
  }
}

function ensureDayMetricsSheet() {
  var sheet = getDayMetricsSheet()

  if (sheet) {
    return sheet
  }

  var lock = LockService.getScriptLock()
  lock.waitLock(Config.DAY_METRICS_LOCK_TIMEOUT_MS)

  try {
    sheet = getDayMetricsSheet()
    return sheet || getOrCreateSheet_(Config.SHEET_DAY_METRICS, Config.DAY_METRICS_HEADERS)
  } finally {
    lock.releaseLock()
  }
}

function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
}

function getOrCreateSheet_(name, headers) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = spreadsheet.getSheetByName(name)

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name)
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  }

  return sheet
}
