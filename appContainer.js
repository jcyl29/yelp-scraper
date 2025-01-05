import { initSubHeader } from "./subheader.js";
import { renderApp } from "./app.js";

const loginDialog = document.getElementById("loginDialog");
const loadingOverlay = document.getElementById("loadingOverlay");
const loginform = document.getElementById("login-form");
let data;

loginform.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = e.submitter;

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  loginDialog.close();

  try {
    // UNCOMMENT IF I want to make real call
    const response = await fetch("https://eo48s27n7940e1j.m.pipedream.net", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const respText = await response.text();
      throw new Error(`Error fetching API endpoint. msg=${respText}`);
    }
    // END UNCOMMENT

    if (btn.id === "cancel") {
      let data = JSON.parse(localStorage.getItem("data"));
      renderApp(data);
      return;
    }

    // uncomment if I want to use local testing
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    // const response = await fetch(
    //   "http://127.0.0.1:8080/jlui_checkin_data.json",
    // );
    // END uncomment if i want to use local testing

    const resp = await response.json();
    const data = resp.result;
    renderApp(data);
    localStorage.setItem("data", JSON.stringify(data));
  } catch (error) {
    console.error("Error:", error.message);
    alert(`An error occurred. Please try again. msg=${error.message}`);
    loginDialog.showModal();
  } finally {
    loadingOverlay.classList.add("hide");
  }
});

window.addEventListener("load", async (event) => {
  data = localStorage.getItem("data");
  const params = new URL(document.location.toString()).searchParams;
  const useMe = !!params.get("me");

  if (useMe) {
    const resp = await fetch(
      "https://raw.githubusercontent.com/jcyl29/yelp-scraper/refs/heads/main/jlui_checkin_data.json",
      {cache: "no-cache"},
    );
    const parsedResp = await resp.json();

    data = parsedResp.result;
    loadingOverlay.classList.add("hide");

    localStorage.setItem("data", JSON.stringify(data));
    const subMenuData = data.reduce(
      (acc, currVal) => {
        currVal.categories.forEach((c) => {
          acc.categories.add(c);
        });

        const date = new Date(currVal.lastCheckInDate);
        acc.years.add(date.getFullYear());

        acc.regionCodes.add(currVal.regionCode);
        acc.cities.add(currVal.city);

        if (currVal.reviewCount > acc.highestReview.reviewCount) {
          acc.highestReview = { ...currVal };
        }

        if (currVal.rating > acc.highestRating.rating) {
          acc.highestRating = { ...currVal };
        }

        if (currVal.rating && currVal.rating < acc.lowestRating.rating) {
          acc.lowestRating = { ...currVal };
        }

        return acc;
      },
      {
        categories: new Set(),
        years: new Set(),
        regionCodes: new Set(),
        cities: new Set(),
        highestReview: { reviewCount: 0 },
        highestRating: { rating: 0 },
        lowestRating: { rating: 5 },
      },
    );
    window.subMenuData = subMenuData;
    renderApp(data);
    initSubHeader(subMenuData);
    return;
  }

  if (data) {
    renderApp(JSON.parse(data));
    loadingOverlay.classList.add("hide");
  } else {
    loginDialog.showModal();
  }
});
