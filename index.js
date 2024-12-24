import puppeteer from "puppeteer";

const YELP_LOGIN_URL = "https://www.yelp.com/login";
const YELP_CHECKINS_URL = "https://www.yelp.com/user_details_checkins";
const USERNAME = "USERNAME"; // Replace with your Yelp email
const PASSWORD = "PASSWORD"; // Replace with your Yelp password
const TIMEOUT = 6000;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set default timeout for all actions
  await page.setDefaultTimeout(TIMEOUT);
  await page.setDefaultNavigationTimeout(TIMEOUT);

  try {
    // Navigate to Yelp login page

    await page.goto(YELP_LOGIN_URL, { waitUntil: "domcontentloaded" });

    // Wait for the email and password fields to load
    await page.waitForSelector("#ajax-login #email", { visible: true });

    await page.waitForSelector("#ajax-login #password", { visible: true });
    await page.type("#ajax-login #email", USERNAME, { delay: 100 });
    await page.type("#ajax-login #password", PASSWORD, { delay: 100 });

    // Submit the form
    await page.keyboard.press("Enter");

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Navigate to the Check-ins page
    await page.goto(YELP_CHECKINS_URL, { waitUntil: "networkidle2" });

    // Get the page's HTML
    const pageHTML = await page.content();
    // $("[aria-live=polite] ul")
    //
    // Data i would need to get from visiting the biz itself, in order of importance
    // Addresss
    // Phone number
    // Business hours

    console.log(pageHTML);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
})();
