const {parsePhoneNumberFromString} = require('libphonenumber-js');

function parsePhone(input) {
    const digits = String(input || "").replace(/\D/g, '');
    const parsed = parsePhoneNumberFromString('+' + digits);
    if (!parsed || !parsed.isValid()) return null;

    return {
        numero: parsed.number.slice(1),
        country: parsed.country || null
    }
}

function normalizePhone(input) {
    return parsePhone(input)?.numero || null
}

normalizePhone.parse = parsePhone

module.exports = normalizePhone