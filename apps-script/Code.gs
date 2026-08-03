function doPost(e) {
  var request

  try {
    request = JSON.parse(e.postData.contents)
  } catch (exception) {
    warn('Malformed JSON request.')
    return failure('INVALID_JSON', 'The request body must contain valid JSON.')
  }

  return dispatchAction(request)
}
