// @ts-check

/**
 * Helper: assign value to result object, handling duplicate keys by converting to array.
 *
 * @param {Object} result
 * @param {string} key
 * @param {*} value
 */
function fmAssign(result, key, value) {
  if (result[key] !== undefined) {
    if (!Array.isArray(result[key])) {
      result[key] = [result[key]];
    }
    result[key].push(value);
  } else {
    result[key] = value;
  }
}

module.exports = { fmAssign: fmAssign };
