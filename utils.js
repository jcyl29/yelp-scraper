const YELP_DOMAIN = "https://www.yelp.com";
const TARGET_SCRIPT_SELECTOR =
  'script[data-apollo-state][type="application/json"]';

/**
 * Utility function to find the first key in an object that matches a regex pattern.
 *
 * @param {Object} obj - The object to search through.
 * @param {RegExp} regex - The regex pattern to match keys.
 * @returns {string} - The matching key.
 * @throws {Error} - Throws an error if no match is found or if multiple matches are found.
 */
function findKeyByRegex(obj, regex) {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid object provided");
  }
  if (!(regex instanceof RegExp)) {
    throw new Error("Invalid regex pattern provided");
  }

  const matchingKeys = Object.keys(obj).filter((key) => regex.test(key));

  if (matchingKeys.length === 0) {
    throw new Error(
      `No keys matching the regex pattern: ${regex}, obj=${JSON.stringify(obj)}`,
    );
  }
  if (matchingKeys.length > 1) {
    throw new Error(
      `Multiple keys match the regex pattern: ${regex}. Matches: ${matchingKeys.join(", ")}, obj=${JSON.stringify(obj)}`,
    );
  }

  return matchingKeys[0];
}

const removeSpaces = (str) => str.replaceAll(" ", "");

const getResolvedValue = (obj, key) => {
  const result = obj[key] || obj[removeSpaces(key)];
  return result || {};
};

function getBizDataFromId(id, state) {
  const biz = state[id];
  const name = biz.name;
  const yelpUrl = `${YELP_DOMAIN}/biz/${biz.alias}`;
  const rating = biz.rating;
  const reviewCount = biz.reviewCount;
  const priceRange = biz.priceRange?.display || "";

  const categories = biz.categories.map((c) => {
    const categoryId = c.__ref;
    const result = getResolvedValue(state, categoryId);
    return result.title;
  });

  let photoUrl = "";
  const photoId = biz?.primaryPhoto?.__ref;
  if (photoId) {
    const photoData = getResolvedValue(state, photoId);
    const photoUrlKey = findKeyByRegex(photoData.photoUrl, /^url\(/);
    photoUrl = removeSpaces(photoData.photoUrl[photoUrlKey]);
  }

  const locationData = getResolvedValue(state, biz.location.__ref);

  return {
    name,
    yelpUrl,
    rating,
    reviewCount,
    priceRange,
    categories,
    photoUrl,
    addressLine1: locationData.address.addressLine1,
    city: locationData.address.city,
    neighborhoods: locationData.neighborhoods,
    regionCode: locationData.address.regionCode,
  };
}

function getCheckInDataFromId(id, state) {
  const checkInData = state[id];
  return {
    lastCheckInDate: removeSpaces(checkInData.createdAt.utcDateTime),
  };
}

export {
  findKeyByRegex,
  removeSpaces,
  getBizDataFromId,
  getCheckInDataFromId,
  TARGET_SCRIPT_SELECTOR,
};
