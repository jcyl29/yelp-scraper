import puppeteer from "puppeteer";
import { load } from "cheerio";
import processPage from "./processPage.js";
import fs from "fs/promises";
import pushToGithub from "./pushToGithub.js";
import { TARGET_SCRIPT_SELECTOR } from "./utils.js";

const YELP_CHECKINS_URL = "https://www.yelp.com/user_details_checkins";
const OUTPUT_FILE = "jlui_checkin_data.json";
const MAX_RETRIES = 20;
const githubToken = process.env.ACCESS_TOKEN;

// how to get websocket url
// Open chrome from terminal
// /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-deing-port=9222
// navigate to http://localhost:9222/json/version on one of your tabs
// alternatively curl url http://localhost:9222/json/version
// that url should show an obj, look for webSocketDebuggerUrl
const WEBSOCKET_URL =
  "ws://localhost:9222/devtools/browser/EXAMPLE_HASH";

const connectToExistingBrowser = async () => {
  console.time("scriptExecution");

  if (!githubToken) {
    throw new Error(
      "Missing Personal access token, add it as a environment variable with name ACCESS_TOKEN",
    );
  }

  // Replace with your actual WebSocket URL
  const browserWSEndpoint = WEBSOCKET_URL;

  // Connect to the existing browser
  const browser = await puppeteer.connect({ browserWSEndpoint });

  console.log("Connected to browser!");
  // Select a specific target
  const target = (await browser.targets()).find((t) =>
    t.url().includes(YELP_CHECKINS_URL),
  );

  if (!target) {
    throw new Error(`target url not found. url=${YELP_CHECKINS_URL}`);
  }

  const page = await target.page();

  // go to the intended url just to make sure we start at the beginning
  await page.goto(YELP_CHECKINS_URL, { waitUntil: "networkidle2" });
  await page.reload({ bypassCache: true });

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

  console.log(`Total pages ${totalPages}`);

  let result = processPage(pageHTML);

  for (let i = 1; i < totalPages; i++) {
    const startQueryParam = i * 10;
    await page.goto(`${YELP_CHECKINS_URL}?start=${startQueryParam}`, {
      waitUntil: "networkidle2",
    });
    var newPageHtml = await page.content();

    const $ = load(newPageHtml);
    var targetScript = $(TARGET_SCRIPT_SELECTOR);
    for (let r = 1; r <= MAX_RETRIES; r++) {
      if (!targetScript.length) {
        console.log(`target script not found, refreshing page. Attempt=${r}`);
        await page.reload({ bypassCache: true });
        newPageHtml = await page.content();
        const $ = load(newPageHtml);
        targetScript = $(TARGET_SCRIPT_SELECTOR);
      } else {
        console.log(`Target script found after ${r} attempts`);
        break;
      }
      if (r === MAX_RETRIES) {
        throw new Error(`Max retries of ${MAX_RETRIES} exceeded`);
      }
    }

    console.log(`Processing page ${i + 1} of ${totalPages}`);
    result = [...result, ...processPage(newPageHtml)];
  }

  // Write the parsed data to a file
  await fs.writeFile(OUTPUT_FILE, JSON.stringify({ result }, null, 2));
  await pushToGithub({
    githubToken,
    filePath: OUTPUT_FILE,
    fileContent: { result },
  });

  // Cleanup
  await browser.disconnect();
  console.timeEnd("scriptExecution");
};

// Run the function
connectToExistingBrowser().catch((error) => {
  console.error("Error connecting to the browser:", error);
});
