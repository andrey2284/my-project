export const tryParseJson = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const extractFirstJsonObject = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return tryParseJson(text.slice(start, end + 1));
};
