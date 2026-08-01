import { load } from "cheerio";
import { decode } from "html-entities";
import {
  findKeyByRegex,
  getBizDataFromId,
  getCheckInDataFromId,
} from "./utils.js";

const getApolloDataFromScriptV1 = ($) => {
  // script looks like:
  // <script data-apollo-state="..." type="application/json">{{ escaped json string }}</script>
  // Unescape and parse the json content
  // in the M2 MacBook the data comes this way
  const targetScript = $('script[data-apollo-state][type="application/json"]');
  // Extract and parse the JSON content
  if (targetScript.length > 0) {
    // Extract the raw content and remove comment markers
    let jsonContent = targetScript.html();
    jsonContent = jsonContent.replace(/<!--|-->/g, "").trim();

    jsonContent = decode(jsonContent);
    // console.log("target script found in one with data-apollo-state attribute");
    return JSON.parse(jsonContent);
  }
  return null;
};
const getApolloDataFromScriptV2 = ($) => {
  // script looks like:
  // <script>window.yelp = window.yelp || {}; window.yelp.react_apollo_state = ... </script>
  // I want value of react_apollo_state
  // in the Intel MacBook the data comes this way
  const targetScript = $("script").filter((index, el) => {
    return $(el).html().includes("checkInsForBusinesses");
  });

  if (targetScript.length > 0) {
    // Extract the raw content and remove comment markers
    let jsonContent = targetScript.html();
    jsonContent = jsonContent.replace(
      "window.yelp = window.yelp || {}; window.yelp.react_apollo_state = ",
      "",
    );

    // get rid of last character
    jsonContent = jsonContent.slice(0, -1);
    try {
      const result = JSON.parse(jsonContent);
      // console.log(
      //   "target script found in plain script with window.yelp.react_apollo_state",
      // );
      return result;
    } catch {
      return null;
    }
  }

  return null;
};

const getParsedDataFromHtml = ($, skipLogging = false) => {
  let parsedData = getApolloDataFromScriptV1($);
  if (!parsedData) {
    parsedData = getApolloDataFromScriptV2($);
    if (!skipLogging) {
      console.log(
        "target script found in plain script with window.yelp.react_apollo_state",
      );
    }
  } else {
    if (!skipLogging) {
      console.log(
        "target script found in one with data-apollo-state attribute",
      );
    }
  }
  return parsedData;
};

const processPage = (pageHtml) => {
  try {
    // Load HTML into Cheerio
    const $ = load(pageHtml);

    const parsedData = getParsedDataFromHtml($);
    if (!parsedData) {
      console.error(
        "target script not found from neither V1 and V2 search methods",
      );
      return [];
    }
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
  } catch (error) {
    console.error("Error processing page:", error);
    return [];
  }
};

export { getParsedDataFromHtml, processPage };
