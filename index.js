import puppeteer from "puppeteer";
import { load } from "cheerio";
import processPage from "./processPage.js";
import readlineSync from "readline-sync";
import fs from "fs/promises";
import pushToGithub from "./pushToGithub.js";
import { TARGET_SCRIPT_SELECTOR } from "./utils.js";

const YELP_LOGIN_URL = "https://www.yelp.com/login";
const YELP_CHECKINS_URL = "https://www.yelp.com/user_details_checkins";
const TIMEOUT = 60000;
const OUTPUT_FILE = "jlui_checkin_data.json";

(async () => {
  console.time("scriptExecution");

  const browser = await puppeteer.launch({
    headless: false,
    browser: "chrome",
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  );

  await page.setViewport({
    width: 1920, // Set the desired width
    height: 1080, // Set the desired height
  });

  // Set default timeout for all actions
  await page.setDefaultTimeout(TIMEOUT);
  await page.setDefaultNavigationTimeout(TIMEOUT);

  try {
    const email = readlineSync.question("Enter your Yelp email: ");
    const password = readlineSync.question("Enter your Yelp password: ", {
      hideEchoBack: true,
    });
    const githubToken = readlineSync.question(
      "Enter Personal access token (classic): ",
    );

    // Navigate to Yelp login page
    await page.goto(YELP_LOGIN_URL, { waitUntil: "domcontentloaded" });

    // Wait for the email and password fields to load
    await page.waitForSelector("#ajax-login #email", { visible: true });

    await page.waitForSelector("#ajax-login #password", { visible: true });
    await page.type("#ajax-login #email", email, { delay: 100 });
    await page.type("#ajax-login #password", password, { delay: 100 });

    // Submit the form
    await page.keyboard.press("Enter");

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Navigate to the Check-ins page
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

    let result = processPage(pageHTML);

    for (let i = 1; i < totalPages; i++) {
      const startQueryParam = i * 10;
      await page.goto(`${YELP_CHECKINS_URL}?start=${startQueryParam}`, {
        waitUntil: "networkidle2",
      });
      var newPageHtml = await page.content();

      const $ = load(newPageHtml);
      var targetScript = $(TARGET_SCRIPT_SELECTOR);
      for (let r = 1; r < 3; r++ ) {
        if (!targetScript.length) {
          console.log(`target script not found, refreshing page. Attempt=${r}`);
          newPageHtml = await page.reload({ bypassCache: true });
          const $ = load(newPageHtml);
          targetScript = $(TARGET_SCRIPT_SELECTOR);
        } else {
          break;
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
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
    console.timeEnd("scriptExecution");
  }
})();
