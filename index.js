import puppeteer from "puppeteer";
import processPage from "./processPage.js";
import readlineSync from "readline-sync";
import fs from "fs/promises";

const YELP_LOGIN_URL = "https://www.yelp.com/login";
const YELP_CHECKINS_URL = "https://www.yelp.com/user_details_checkins";
const TIMEOUT = 60000;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
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

    // Write the parsed data to a file
    await fs.writeFile("result.json", JSON.stringify({ result }, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
})();
