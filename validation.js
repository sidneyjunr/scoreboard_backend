const SCHEMA = {
  team1_name: 'string',
  team1_score: 'score',
  team1_fouls: 'fouls',
  team1_logo: 'string',
  team1_bg_color: 'string',
  team1_name_color: 'string',
  team1_stripe1_color: 'string',
  team1_stripe2_color: 'string',
  team2_name: 'string',
  team2_score: 'score',
  team2_fouls: 'fouls',
  team2_logo: 'string',
  team2_bg_color: 'string',
  team2_name_color: 'string',
  team2_stripe1_color: 'string',
  team2_stripe2_color: 'string',
  period: 'string',
  foul_active_color: 'string',
  foul_inactive_color: 'string',
};

const VALID_FIELDS = Object.keys(SCHEMA);

function sanitizeValue(field, value) {
  const type = SCHEMA[field];
  if (!type) return undefined;

  switch (type) {
    case 'string':
      return typeof value === 'string' ? value.slice(0, 500) : String(value).slice(0, 500);
    case 'score':
      return Math.max(0, parseInt(value) || 0);
    case 'fouls':
      return Math.max(0, Math.min(5, parseInt(value) || 0));
    default:
      return undefined;
  }
}

function validateScoreData(data, currentData) {
  const result = { ...currentData };

  for (const field of VALID_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const sanitized = sanitizeValue(field, data[field]);
      if (sanitized !== undefined) {
        result[field] = sanitized;
      }
    }
  }

  return result;
}

module.exports = { VALID_FIELDS, SCHEMA, sanitizeValue, validateScoreData };
