import { load } from "cheerio";
import { decode } from "html-entities";
import {
  findKeyByRegex,
  getBizDataFromId,
  getCheckInDataFromId,
} from "./utils.js";

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
      return {}
    }
  } catch (error) {
    console.error("Error processing page:", error);
    return {}
  }
}

export default processPage;