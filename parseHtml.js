import { load } from "cheerio";
import fs from "fs/promises";

const YELP_DOMAIN = "https://www.yelp.com";

(async () => {
  try {
    // Load the local HTML file
    const html = await fs.readFile("yelp_checkin_page.html", "utf8");

    // Load HTML into Cheerio
    const $ = load(html);

    // Array to hold extracted data
    const businessData = [];

    // Select each list item in the target `<ul>`
    $("div[aria-live=polite] ul[class*=list] > li").each((_, li) => {
      const business = {};

      // Extract data for each business
      business.name = $(li)
        .find("[class*=businessTitleContainer] a")
        .text()
        .trim();
      business.thumbnail = $(li).find("img").attr("src") || null;
      business.url = $(li).find("a").attr("href") || null;
      business.aggregateRating =
        $(li).find("[itemprop=ratingValue]").attr("content") || null;
      business.numberOfRatings =
        $(li).find("[itemprop=reviewCount]").text().trim() || null;
      business.numberOfCheckins =
        $(li).find("[class*=check-in] + span").text().trim() || null;

      if (business.url) {
        business.url = `${YELP_DOMAIN}${business.url}`;
      }

      if (business.numberOfCheckins) {
        business.numberOfCheckins = parseFloat(business.numberOfCheckins);
      }

      // Extract "Last check-in date"
      const lastCheckInText = $(li)
        .find('p:contains("Last check-in")')
        .text()
        .trim();
      business.lastCheckInDate =
        lastCheckInText.replace("Last check-in: ", "") || null;

      if (business.lastCheckInDate) {
        business.lastCheckInDate = new Date(business.lastCheckInDate);
      }

      // Push the business data into the array
      businessData.push(business);
    });

    // Write the data to a JSON file
    await fs.writeFile(
      "businessData.json",
      JSON.stringify(businessData, null, 2),
    );
    console.log("Data saved to businessData.json");
  } catch (error) {
    console.error("Error:", error);
  }
})();
