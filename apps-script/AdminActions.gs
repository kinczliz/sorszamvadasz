function adminAccess_(payload) {
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_ACCESS_CODE')
  return expected && payload && typeof payload.accessCode === 'string' && payload.accessCode === expected
}
function getAdminOverview(payload) {
  if (!adminAccess_(payload)) return failure('ACCESS_DENIED', 'Admin access is not authorized.')
  try {
    var states = ensureDayStatesSheet()
    return success({ environments: [Config.ENV_LIVE, Config.ENV_DEMO].map(function (environment) {
      return { environment: environment, days: loadDayStates(states, environment), counts: adminCounts_(environment), metrics: adminMetricsInfo_(environment) }
    }), sheets: adminSheetStatus_() })
  } catch (exception) { logUnexpectedFailure('getAdminOverview', exception); return failure('SERVER_ERROR', 'Admin overview could not be loaded.') }
}
function setDayState(payload) {
  if (!adminAccess_(payload)) return failure('ACCESS_DENIED', 'Admin access is not authorized.')
  if (!payload || [Config.ENV_LIVE, Config.ENV_DEMO].indexOf(payload.environment) === -1) return failure('INVALID_ENVIRONMENT', 'The requested environment is not supported.')
  if (Config.FESTIVAL_DATES_2026.indexOf(payload.date) === -1 || Config.DAY_STATE_VALUES.indexOf(payload.state) === -1) return failure('INVALID_REQUEST', 'Day state request is invalid.')
  var lock = LockService.getScriptLock(); lock.waitLock(Config.REGISTRATION_LOCK_TIMEOUT_MS)
  try { var sheet = ensureDayStatesSheet(); var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues(); var match = rows.filter(function (row) { return row[0] === payload.environment && formatDayStateDate_(row[1]) === payload.date })
    if (match.length !== 1) throw new Error('Day states are invalid.')
    var now = new Date().toISOString(); sheet.getRange(rows.indexOf(match[0]) + 2, 3, 1, 2).setValues([[payload.state, now]]); return success({ environment: payload.environment, date: payload.date, state: payload.state, updatedAt: now })
  } catch (exception) { logUnexpectedFailure('setDayState', exception); return failure('SERVER_ERROR', 'Day state could not be updated.') } finally { lock.releaseLock() }
}
function publishMetricsAdmin(payload) {
  if (!adminAccess_(payload)) return failure('ACCESS_DENIED', 'Admin access is not authorized.')
  try { publishMetrics(); return success({ environments: [Config.ENV_LIVE, Config.ENV_DEMO].map(function (environment) { return adminMetricsInfo_(environment) }) }) } catch (exception) { logUnexpectedFailure('publishMetricsAdmin', exception); return failure('SERVER_ERROR', 'Metrics could not be published.') }
}
function previewLiveInitialization(payload) { if (!adminAccess_(payload)) return failure('ACCESS_DENIED', 'Admin access is not authorized.'); return success(adminInitializationCounts_()) }
function initializeLive(payload) {
  if (!adminAccess_(payload)) return failure('ACCESS_DENIED', 'Admin access is not authorized.')
  if (payload.confirmation !== 'LIVE') return failure('INVALID_REQUEST', 'Confirmation is required.')
  var lock = LockService.getScriptLock(); lock.waitLock(Config.METRICS_LOCK_TIMEOUT_MS)
  try { var entries = adminAffectedSheets_(); var snapshots = entries.map(function (entry) { return { sheet: entry.sheet(), rows: entry.sheet() ? readSheetContents_(entry.sheet()) : null } }); var before = adminInitializationCounts_()
    try { entries.forEach(function (entry) { var sheet = entry.sheet(); if (sheet) adminKeepEnvironmentRows_(sheet, entry.headers, Config.ENV_DEMO) }); var daySheet = ensureDayStatesSheet(); adminKeepEnvironmentRows_(daySheet, Config.DAY_STATES_HEADERS, Config.ENV_DEMO); var now = new Date().toISOString(); daySheet.getRange(daySheet.getLastRow() + 1, 1, 5, 4).setValues(Config.FESTIVAL_DATES_2026.map(function (date) { return [Config.ENV_LIVE, date, Config.DAY_STATE_OPEN, now] })); adminVerifyLiveInitialization_(); info('LIVE initialization completed.')
    } catch (exception) { snapshots.forEach(function (snapshot) { if (snapshot.sheet && snapshot.rows) restoreSheetContents_(snapshot.sheet, snapshot.rows) }); throw exception }
    return success({ deleted: before, resetDayStates: 5 })
  } catch (exception) { logUnexpectedFailure('initializeLive', exception); return failure('SERVER_ERROR', 'LIVE initialization could not be completed.') } finally { lock.releaseLock() }
}
function adminAffectedSheets_() { return [{ sheet: getUsersSheet, headers: Config.USERS_HEADERS }, { sheet: getSelectionsSheet, headers: Config.SELECTIONS_HEADERS }, { sheet: getVolunteersSheet, headers: Config.VOLUNTEERS_HEADERS }, { sheet: getDayMetricsSheet, headers: Config.DAY_METRICS_HEADERS }, { sheet: getProgrammeMetricsSheet, headers: Config.PROGRAMME_METRICS_HEADERS }, { sheet: getDayStatesSheet, headers: Config.DAY_STATES_HEADERS }] }
function adminKeepEnvironmentRows_(sheet, headers, environment) { var rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().filter(function (row) { return row[headers.indexOf('environment')] === environment }); sheet.clearContents(); sheet.getRange(1, 1, 1, headers.length).setValues([headers]); if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows) }
function adminCounts_(environment) { return { users: adminCount_(getUsersSheet(), Config.USERS_HEADERS, environment), selections: adminCount_(getSelectionsSheet(), Config.SELECTIONS_HEADERS, environment), volunteers: adminCount_(getVolunteersSheet(), Config.VOLUNTEERS_HEADERS, environment) } }
function adminInitializationCounts_() { return { users: adminCount_(getUsersSheet(), Config.USERS_HEADERS, 'LIVE'), selections: adminCount_(getSelectionsSheet(), Config.SELECTIONS_HEADERS, 'LIVE'), volunteers: adminCount_(getVolunteersSheet(), Config.VOLUNTEERS_HEADERS, 'LIVE'), dayStates: adminCount_(getDayStatesSheet(), Config.DAY_STATES_HEADERS, 'LIVE'), dayMetrics: adminCount_(getDayMetricsSheet(), Config.DAY_METRICS_HEADERS, 'LIVE'), programmeMetrics: adminCount_(getProgrammeMetricsSheet(), Config.PROGRAMME_METRICS_HEADERS, 'LIVE') } }
function adminCount_(sheet, headers, environment) { if (!sheet || sheet.getLastRow() < 2) return 0; var index = headers.indexOf('environment'); return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().filter(function (row) { return row[index] === environment }).length }
function adminMetricsInfo_(environment) { var sheet = getDayMetricsSheet(); if (!sheet || sheet.getLastRow() < 2) return { environment: environment, metricsUpdatedAt: null, metricsVersion: null }; var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Config.DAY_METRICS_HEADERS.length).getValues().filter(function (row) { return row[0] === environment }); return { environment: environment, metricsUpdatedAt: rows.length ? normalizeMetricsTimestamp_(rows[0][7]) : null, metricsVersion: rows.length ? normalizeMetricsVersion_(rows[0][8]) : null } }
function adminSheetStatus_() { return adminAffectedSheets_().map(function (entry) { return entry.headers[0] + ':' + Boolean(entry.sheet()) }) }
function adminVerifyLiveInitialization_() { var counts = adminInitializationCounts_(); if (counts.users || counts.selections || counts.volunteers || counts.dayMetrics || counts.programmeMetrics || counts.dayStates !== 5) throw new Error('LIVE initialization verification failed.'); var states = loadDayStates(getDayStatesSheet(), 'LIVE'); if (Object.keys(states).some(function (date) { return states[date] !== Config.DAY_STATE_OPEN })) throw new Error('LIVE day states are invalid.') }
