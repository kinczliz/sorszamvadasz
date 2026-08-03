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

function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
}
