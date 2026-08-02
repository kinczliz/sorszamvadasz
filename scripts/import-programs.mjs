import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import readXlsxFile from 'read-excel-file/node'

const inputPath = path.resolve('data/2026/Programok.xlsx')
const outputPath = path.resolve('data/2026/programs.json')
const requiredColumns = ['DAY-id', 'PROGRAM_NAME', 'TYPE', 'TIME', 'LOCATION']

function fail(message) {
  throw new Error(`Program import failed: ${message}`)
}

function getRequiredValue(row, column, rowNumber) {
  const value = String(row[column]).trim()

  if (!value) {
    fail(`row ${rowNumber}: "${column}" is empty.`)
  }

  return value
}

function getFestivalDay(dayId, rowNumber) {
  const separatorIndex = dayId.lastIndexOf('-')

  if (separatorIndex <= 0) {
    fail(`row ${rowNumber}: "DAY-id" must follow the format "NAP-01".`)
  }

  return dayId.slice(0, separatorIndex)
}

function getStartTime(value, rowNumber) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`
  }

  const time = String(value).trim()

  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) {
    fail(`row ${rowNumber}: "TIME" must be in HH:MM format.`)
  }

  return time.padStart(5, '0')
}

function getProgramId(dayId) {
  const hash = createHash('sha1').update(`sorszamvadasz:2026:${dayId}`).digest('hex')
  const variant = (8 + (Number.parseInt(hash[16], 16) % 4)).toString(16)

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

const [firstSheet] = await readXlsxFile(inputPath)

if (!firstSheet) {
  fail('the workbook has no worksheets.')
}

const [headerRow, ...dataRows] = firstSheet.data
const columns = headerRow.map((column) => String(column).trim())
const missingColumns = requiredColumns.filter((column) => !columns.includes(column))

if (missingColumns.length > 0) {
  fail(`missing expected columns: ${missingColumns.join(', ')}.`)
}

const rows = dataRows
  .filter((row) => row.some((value) => String(value ?? '').trim()))
  .map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])))

if (rows.length === 0) {
  fail('the worksheet has no programme rows.')
}

const dayIds = new Set()
const programs = rows.map((row, index) => {
  const rowNumber = index + 2
  const dayId = getRequiredValue(row, 'DAY-id', rowNumber)

  if (dayIds.has(dayId)) {
    fail(`row ${rowNumber}: duplicate "DAY-id" value "${dayId}".`)
  }

  dayIds.add(dayId)

  return {
    id: getProgramId(dayId),
    day: getFestivalDay(dayId, rowNumber),
    dayId,
    startTime: getStartTime(row.TIME, rowNumber),
    title: getRequiredValue(row, 'PROGRAM_NAME', rowNumber),
    type: getRequiredValue(row, 'TYPE', rowNumber),
    location: getRequiredValue(row, 'LOCATION', rowNumber),
    active: true,
  }
})

await fs.writeFile(outputPath, `${JSON.stringify(programs, null, 2)}\n`)
console.log(`Imported ${programs.length} programmes into ${path.relative(process.cwd(), outputPath)}.`)
