import puppeteer from "puppeteer";
import { load } from "cheerio";
import processPage from "./processPage.js";
import pushToGithub from "./pushToGithub.js";
import { TARGET_SCRIPT_SELECTOR } from "./utils.js";
import isTokenValid from "./isTokenValid.js";

const YELP_HOME_PAGE = "https://www.yelp.com";
const YELP_CHECKINS_URL = "https://www.yelp.com/user_details_checkins";
const OUTPUT_FILE = "jlui_checkin_data.json";
const MAX_RETRIES = 20;
const githubToken = process.env.ACCESS_TOKEN;

// how to get websocket url
// Manually copy user profile
// Manually copy your user profile
// cp -r ~/Library/Application\ Support/Google/Chrome/Default ~/chrome-debug-profile
// /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//   --remote-debugging-port=9222 \
//   --user-data-dir="$HOME/chrome-debug-profile"
// Then start Chrome if it hasn't started
// /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
// The websocket url is what follows 'DevTools listening on..."
// TROUBLESHOOTING
// If scraper fails to get the script data, navigate to yelp home page
// Also disable cache in network tab of browser debugger

const WEBSOCKET_UUID = 'EXAMPLE_UUID'
const WEBSOCKET_URL =
  `ws://127.0.0.1:9222/devtools/browser/${WEBSOCKET_UUID}`;

const connectToExistingBrowser = async () => {
  console.time("scriptExecution");

  if (!githubToken) {
    throw new Error(
      "Missing Personal access token, add it as a environment variable with name ACCESS_TOKEN",
    );
  }

  if (!await isTokenValid(githubToken)) {
    console.error("github personal token not valid, may need to create another one ");
    process.exit(1)
  }

  // Replace with your actual WebSocket URL
  const browserWSEndpoint = WEBSOCKET_URL;

  // Connect to the existing browser
  const browser = await puppeteer.connect({ browserWSEndpoint });

  console.log("Connected to browser!");
  // Select a specific target
  const target = (await browser.targets()).find((t) =>
    t.url().includes(YELP_HOME_PAGE),
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

  if (totalPages !== null) {
    totalPages = parseInt(totalPages.replace("1 of ", ""), 10);
  } else {
    console.error("could not parse html for total pages")
    process.exit(1)
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
        console.log(`target script not found, refreshing page. Page=${i}, Attempt=${r}`);
        await page.reload({ bypassCache: true });
        newPageHtml = await page.content();
        const $ = load(newPageHtml);
        targetScript = $(TARGET_SCRIPT_SELECTOR);
      } else {
        console.log(`Target script found after ${r} attempts, processing page ${i + 1} of ${totalPages}`);
        break;
      }
      if (r === MAX_RETRIES) {
        throw new Error(`Max retries of ${MAX_RETRIES} exceeded`);
      }
    }
    
    result = [...result, ...processPage(newPageHtml)];
  }

  // Write the parsed data to a file
  // await fs.writeFile(OUTPUT_FILE, JSON.stringify({ result }, null, 2));
  
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
  process.exit(1)
});
