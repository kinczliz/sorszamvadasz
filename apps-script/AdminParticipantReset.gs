var ADMIN_RESET_ENVIRONMENT = 'LIVE'
var ADMIN_RESET_USER_ID = ''
var ADMIN_RESET_CONFIRMATION = ''

function previewParticipantReset() {
  var target = validateAdminResetTarget_()
  var user = findAdminResetUser_(getUsersSheet(), target)
  var relatedSheets = getParticipantOwnedSheets_()
  var counts = relatedSheets.map(function (entry) {
    return { name: entry.name, count: countParticipantOwnedRows_(entry.sheet(), target) }
  })

  info('Participant reset preview: environment=' + target.environment + '; userId=' + target.userId + '; displayName=' + user.displayName + '; selections=' + counts[0].count + '; volunteerRecords=' + counts[1].count)
}

function deleteParticipantReset() {
  if (ADMIN_RESET_CONFIRMATION !== 'DELETE') {
    throw new Error('Set ADMIN_RESET_CONFIRMATION to DELETE before deleting.')
  }

  var target = validateAdminResetTarget_()
  var lock = LockService.getScriptLock()
  var lockAcquired = false

  try {
    lock.waitLock(Config.REGISTRATION_LOCK_TIMEOUT_MS)
    lockAcquired = true

    var usersSheet = getUsersSheet()
    var user = findAdminResetUser_(usersSheet, target)
    var relatedSheets = getParticipantOwnedSheets_()
    var snapshots = [{ sheet: usersSheet, rows: snapshotSheetRows_(usersSheet) }]

    relatedSheets.forEach(function (entry) {
      var sheet = entry.sheet()
      if (sheet) snapshots.push({ sheet: sheet, rows: snapshotSheetRows_(sheet) })
    })

    try {
      relatedSheets.forEach(function (entry) {
        var sheet = entry.sheet()
        if (sheet) replaceParticipantOwnedRows_(sheet, target.environment, target.userId, [])
      })
      deleteSheetRows_(usersSheet, function (row) {
        return String(row[0]).toLowerCase() === target.userId && row[1] === target.environment
      })
    } catch (exception) {
      snapshots.forEach(function (snapshot) { restoreSheetRows_(snapshot.sheet, snapshot.rows) })
      throw exception
    }

    info('Participant reset completed: environment=' + target.environment + '; userId=' + target.userId + '; displayName=' + user.displayName + '. Run publishMetrics() to refresh published counts.')
  } finally {
    if (lockAcquired) lock.releaseLock()
  }
}

function validateAdminResetTarget_() {
  if (ADMIN_RESET_ENVIRONMENT !== Config.ENV_LIVE && ADMIN_RESET_ENVIRONMENT !== Config.ENV_DEMO) throw new Error('Admin reset environment is invalid.')
  if (!isUuid(ADMIN_RESET_USER_ID)) throw new Error('Admin reset user ID must be a valid UUID.')
  return { environment: ADMIN_RESET_ENVIRONMENT, userId: ADMIN_RESET_USER_ID.toLowerCase() }
}

function findAdminResetUser_(sheet, target) {
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Participant was not found.')

  var matches = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.USERS_HEADERS.length).getValues().filter(function (row) {
    return String(row[0]).toLowerCase() === target.userId && row[1] === target.environment
  })

  if (matches.length !== 1) throw new Error(matches.length === 0 ? 'Participant was not found.' : 'Duplicate participant rows were found.')
  return { displayName: matches[0][2] }
}

function getParticipantOwnedSheets_() {
  return [
    { name: 'selections', sheet: getSelectionsSheet, headers: Config.SELECTIONS_HEADERS },
    { name: 'volunteers', sheet: getVolunteersSheet, headers: Config.VOLUNTEERS_HEADERS },
  ]
}

function countParticipantOwnedRows_(sheet, target) {
  if (!sheet || sheet.getLastRow() < 2) return 0
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues().filter(function (row) {
    return row[1] === target.userId && row[2] === target.environment
  }).length
}

function deleteSheetRows_(sheet, matches) {
  for (var rowIndex = sheet.getLastRow(); rowIndex >= 2; rowIndex -= 1) {
    var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0]
    if (matches(row)) sheet.deleteRow(rowIndex)
  }
}

function snapshotSheetRows_(sheet) {
  return sheet.getLastRow() > 0 ? sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues() : []
}

function restoreSheetRows_(sheet, rows) {
  sheet.clearContents()
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows)
}
