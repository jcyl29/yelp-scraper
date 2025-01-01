import { puppeteer } from "@pipedream/browsers";
import { load } from "cheerio";

const TOUR_DATES_URL = "https://www.videogameslive.com/tour-dates/";
const SEARCH_TERMS = ["San Francisco", "San Jose", "Los Angeles"];

export default defineComponent({
  async run({ steps, $ }) {
    const browser = await puppeteer.browser();

    const page = await browser.newPage();

    await page.goto(TOUR_DATES_URL, { waitUntil: "domcontentloaded" });

    // Get the page's HTML
    const pageHTML = await page.content();

    const $$ = load(pageHTML);
    const currentTours = $$("h1:contains('On tour now')").parent();
    let subject = "";
    let message = "";

    SEARCH_TERMS.forEach((term) => {
      const target = currentTours.find(`.Tour-location:contains('${term}')`);
      if (target.length) {
        subject = `VGM (Video games Live) has a concert at ${term}! Date found: ${new Date().toLocaleDateString()}`;
        message = `More info: ${target.text()}`;
        console.log(`Match found! ${message}`);
      }
    });

    if (message) {
      $.send.email({
        subject,
        text: message,
      });
    }
    await browser.close();
  },
});
