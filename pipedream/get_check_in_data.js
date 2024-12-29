import { puppeteer } from "@pipedream/browsers";
import { load } from "cheerio";
import { decode } from "html-entities";

const YELP_LOGIN_URL = "https://www.yelp.com/login";
const YELP_CHECKINS_URL = "https://www.yelp.com/user_details_checkins";

const YELP_DOMAIN = "https://www.yelp.com";

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

const processPage = (pageHtml) => {
  try {
    // Load HTML into Cheerio
    const $ = load(pageHtml);
    const scriptTag = $('script[data-apollo-state][type="application/json"]');

    // Extract and parse the JSON content
    if (scriptTag.length > 0) {
      // Extract the raw content and remove comment markers
      let jsonContent = scriptTag.html();
      jsonContent = jsonContent.replace(/<!--|-->/g, "").trim();

      jsonContent = decode(jsonContent);

      // Parse the cleaned JSON content
      const parsedData = JSON.parse(jsonContent);

      const userKey = findKeyByRegex(parsedData, /^User:\s*.*/);
      const userObj = parsedData[userKey];
      const checkInBizKey = findKeyByRegex(userObj, /^checkInsForBusinesses.*/);

      const { edges } = userObj[checkInBizKey];

      return edges.map((e) => {
        const { node } = e;
        return {
          checkInCount: node.checkInCount,
          ...getCheckInDataFromId(node.lastCheckIn.__ref, parsedData),
          ...getBizDataFromId(node.business.__ref, parsedData),
        };
      });
    } else {
      console.log("No matching <script> tag found.");
      return {};
    }
  } catch (error) {
    console.error("Error processing page:", error);
    return {};
  }
};

export default defineComponent({
  async run({ steps, $ }) {
    // uncomment if i want to use user input form for sending those
    // as form post body fields
    // const { email, password } = steps.trigger.event.body;

    const { yelpUserEmail: email, yelpPassword: password } = process.env;

    if (!email || !password) {
      throw new Error("Email and password are required!");
    }

    const browser = await puppeteer.browser();

    const page = await browser.newPage();

    await page.goto(YELP_LOGIN_URL, { waitUntil: "domcontentloaded" });

    await page.waitForSelector("#ajax-login #email", { visible: true });

    await page.waitForSelector("#ajax-login #password", { visible: true });
    await page.type("#ajax-login #email", email, {
      delay: 100,
    });
    await page.type("#ajax-login #password", password, { delay: 100 });

    // Submit the form
    await page.keyboard.press("Enter");

    // Wait for navigation after login
    try {
      await page.waitForNavigation({ waitUntil: "networkidle2" });
    } catch (e) {
      console.log(
        `failure after submitting login info. e=${JSON.stringify(e)}`,
      );
    }

    // Navigate to the Check-ins page
    await page.goto(YELP_CHECKINS_URL, { waitUntil: "networkidle2" });

    // Get the page's HTML
    const pageHTML = await page.content();

    let totalPages = await page.evaluate(() => {
      const element = document.querySelector(
        "[aria-label*=Pagination] > div:nth-child(2)",
      );
      return element ? element.textContent.trim() : null;
    });

    if (totalPages) {
      totalPages = parseInt(totalPages.replace("1 of ", ""), 10);
    }

    let result = processPage(pageHTML);

    for (let i = 1; i < totalPages; i++) {
      const startQueryParam = i * 10;
      await page.goto(`${YELP_CHECKINS_URL}?start=${startQueryParam}`, {
        waitUntil: "networkidle2",
      });
      const newPageHtml3 = await page.content();
      console.log(`Processing page ${i + 1} of ${totalPages}`);
      result = [...result, ...processPage(newPageHtml3)];
    }

    $.export("result", { result });

    // The browser needs to be closed, otherwise the step will hang
    await browser.close();

    // await $.respond({
    //   status: 200,
    //   body: { result },
    // });
  },
});
