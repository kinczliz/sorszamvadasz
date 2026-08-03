function replaceParticipantOwnedRows_(sheet, environment, userId, replacementRows) {
  var schema = getParticipantRowsSchema_(sheet)
  var snapshot = snapshotParticipantRowsSheet_(sheet)
  var rows = snapshot.slice(1)
  var retainedRows = rows.filter(function (row) { return !isParticipantOwnedRow_(row, environment, userId) })
  var nextRows = [schema.headers].concat(retainedRows, replacementRows)

  try {
    sheet.clearContents()
    sheet.getRange(1, 1, nextRows.length, schema.headers.length).setValues(nextRows)
    SpreadsheetApp.flush()
    verifyParticipantOwnedReplacement_(sheet, environment, userId, replacementRows, schema)
    return snapshot
  } catch (exception) {
    try {
      restoreParticipantRowsSheet_(sheet, snapshot)
    } catch (rollbackException) {
      throw rollbackException
    }
    throw exception
  }
}

function restoreParticipantOwnedRows_(sheet, snapshot) {
  restoreParticipantRowsSheet_(sheet, snapshot)
}

function getParticipantRowsSchema_(sheet) {
  var headers = sheet.getName() === Config.SHEET_SELECTIONS
    ? Config.SELECTIONS_HEADERS
    : sheet.getName() === Config.SHEET_VOLUNTEERS
      ? Config.VOLUNTEERS_HEADERS
      : null

  if (!headers) throw new Error('Participant-owned sheet is not supported.')

  var actualHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0]
  if (sheet.getLastColumn() !== headers.length || !headers.every(function (header, index) { return actualHeaders[index] === header })) {
    throw new Error('Participant-owned sheet schema is invalid.')
  }

  return { headers: headers }
}

function isParticipantOwnedRow_(row, environment, userId) {
  return row[1] === userId && row[2] === environment
}

function verifyParticipantOwnedReplacement_(sheet, environment, userId, replacementRows, schema) {
  var actualRows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, schema.headers.length).getValues().filter(function (row) {
    return isParticipantOwnedRow_(row, environment, userId)
  })
  var expectedByKey = {}
  var actualByKey = {}

  replacementRows.forEach(function (row) {
    var key = row[3]
    if (expectedByKey[key]) throw new Error('Participant replacement contains duplicate keys.')
    expectedByKey[key] = row
  })
  actualRows.forEach(function (row) {
    var key = row[3]
    if (actualByKey[key]) throw new Error('Participant replacement verification found duplicate keys.')
    actualByKey[key] = row
  })

  if (actualRows.length !== replacementRows.length || Object.keys(expectedByKey).some(function (key) {
    return !actualByKey[key] || !participantRowValuesMatch_(expectedByKey[key], actualByKey[key])
  })) throw new Error('Participant replacement verification failed.')
}

function participantRowValuesMatch_(expected, actual) {
  return expected.every(function (value, index) {
    var actualValue = actual[index]

    if (value instanceof Date && actualValue instanceof Date) {
      return value.getTime() === actualValue.getTime()
    }

    return value === actualValue
  })
}

function snapshotParticipantRowsSheet_(sheet) {
  return sheet.getLastRow() > 0 ? sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues() : []
}

function restoreParticipantRowsSheet_(sheet, rows) {
  sheet.clearContents()
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows)
  SpreadsheetApp.flush()
}
