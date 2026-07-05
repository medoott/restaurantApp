const MAX_SEARCH_LENGTH = 200;

export const escapeRegExp = (value = "") => {
  const str = String(value).slice(0, MAX_SEARCH_LENGTH);
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
