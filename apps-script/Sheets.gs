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

function ensureUsersSheet() {
  return getOrCreateSheet_(Config.SHEET_USERS, Config.USERS_HEADERS)
}

function ensureSelectionsSheet() {
  return getOrCreateSheet_(Config.SHEET_SELECTIONS, Config.SELECTIONS_HEADERS)
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
