function success(data) {
  return jsonResponse_({ ok: true, data: data })
}

function failure(code, message) {
  return jsonResponse_({
    ok: false,
    error: { code: code, message: message },
  })
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON)
}
