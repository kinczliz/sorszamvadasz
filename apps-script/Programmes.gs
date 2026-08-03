function getProgrammeDays() {
  var cache = CacheService.getScriptCache()
  var cachedProgrammeDays = cache.get('programme-days')

  if (cachedProgrammeDays) {
    try {
      return JSON.parse(cachedProgrammeDays)
    } catch (exception) {
      cache.remove('programme-days')
      error('Cached programme data is invalid.')
    }
  }

  if (!Config.PROGRAMME_DATA_URL) {
    error('Programme data source is not configured.')
    throw new Error('Programme data URL is not configured.')
  }

  var response

  try {
    response = UrlFetchApp.fetch(Config.PROGRAMME_DATA_URL, { muteHttpExceptions: true })
  } catch (exception) {
    error('Programme data could not be loaded.')
    throw new Error('Programme data could not be loaded.')
  }

  if (response.getResponseCode() !== 200) {
    error('Programme data could not be loaded.')
    throw new Error('Programme data could not be loaded.')
  }

  var programmes

  try {
    programmes = JSON.parse(response.getContentText())
  } catch (exception) {
    error('Programme data is invalid.')
    throw new Error('Programme data is invalid.')
  }

  if (!Array.isArray(programmes)) {
    throw new Error('Programme data is invalid.')
  }

  var programmeDays = {}

  programmes.forEach(function (programme) {
    if (programme && programme.active && typeof programme.id === 'string' && typeof programme.day === 'string') {
      programmeDays[programme.id] = programme.day
    }
  })

  if (Object.keys(programmeDays).length === 0) {
    error('Programme data contains no active programmes.')
    throw new Error('Programme data is invalid.')
  }

  cache.put('programme-days', JSON.stringify(programmeDays), Config.PROGRAMME_CACHE_TTL_SECONDS)
  return programmeDays
}

function testProgrammeDataLoading() {
  var programmeDays = getProgrammeDays()
  var programmeIds = Object.keys(programmeDays)
  var firstProgrammeId = programmeIds[0]
  var festivalDate = Config.PROGRAMME_DAY_DATES_2026[programmeDays[firstProgrammeId]]

  info('Programme data diagnostic: active programmes=' + programmeIds.length)

  if (!festivalDate) {
    throw new Error('Programme day could not be mapped to a festival date.')
  }

  info('Programme data diagnostic: first programme id=' + firstProgrammeId + '; festival date=' + festivalDate)
}
