const loginDialog = document.getElementById("loginDialog");
const loadingOverlay = document.getElementById("loadingOverlay");
const mainContent = document.getElementById("mainContent");
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
    const response = await fetch("https://eombz37jhd2nbiy.m.pipedream.net", {
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
      renderCheckins(data);
      return;
    }

    // uncomment if i want to use local testing
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    // const response = await fetch(
    //   "http://127.0.0.1:8080/jlui_checkin_data.json",
    // );
    // END uncomment if i want to use local testing


    const resp = await response.json();
    const data = resp.result;
    renderCheckins(data);
    localStorage.setItem("data", JSON.stringify(data));
  } catch (error) {
    console.error("Error:", error.message);
    alert(`An error occurred. Please try again. msg=${error.message}`);
    loginDialog.showModal();
  } finally {
    loadingOverlay.classList.add("hide");
  }
});

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function refreshData() {
  // Clear existing data
  mainContent.innerHTML = "";

  // Show the login dialog again
  loginDialog.showModal();
}

function renderCheckins(checkins) {
  mainContent.innerHTML = `
            <div class="header" xmlns="http://www.w3.org/1999/html">
                <h1>Your Yelp Check-ins</h1>
                <button class="btn btn-muted" onclick="refreshData()">Refresh Data</button>
                <div class="stats">${checkins.length} total businesses visited</div>                
            </div>
            <div class="checkin-grid">
                ${checkins
                  .map(
                    (checkin) => `
                    <div class="checkin-card">
                        <div class="restaurant-info">
                            <div class="restaurant-header">
                                ${
                                  checkin.photoUrl
                                    ? `<div class="restaurant-image-container">
                                         <img src="${checkin.photoUrl}" alt="${checkin.name}" class="restaurant-image">
                                       </div>`
                                    : `<div class="restaurant-image-container">
                                         <div class="restaurant-image"></div>
                                       </div>`
                                }
                                <a href="${checkin.yelpUrl}" target="_blank" class="restaurant-name">${checkin.name}</a>
                                ${checkin.priceRange ? `<span class="price-range">${checkin.priceRange}</span>` : ""}
                                <div class="checkin-count">
                                    <span class="checkin-count-icon"></span>
                                    ${checkin.checkInCount} ${checkin.checkInCount === 1 ? "visit" : "visits"}
                                </div>
                            </div>
                            
                            ${
                              checkin.rating !== null
                                ? `
                                <div class="rating">
                                    <span>★ ${checkin.rating.toFixed(1)}</span>
                                    <span class="review-count">${checkin.reviewCount} reviews</span>
                                </div>
                            `
                                : ""
                            }

                            ${
                              checkin.categories &&
                              checkin.categories.length > 0
                                ? `
                                <div class="categories">
                                    ${checkin.categories
                                      .map(
                                        (category) =>
                                          `<span class="category">${category}</span>`,
                                      )
                                      .join("")}
                                </div>
                            `
                                : ""
                            }

                            <div class="address">
                                ${checkin.addressLine1}<br>
                                ${checkin.city}, ${checkin.regionCode}
                            </div>

                            ${
                              checkin.neighborhoods &&
                              checkin.neighborhoods.length > 0
                                ? `
                                <div class="neighborhoods">
                                    ${checkin.neighborhoods
                                      .map(
                                        (neighborhood) =>
                                          `<span class="neighborhood">${neighborhood}</span>`,
                                      )
                                      .join("")}
                                </div>
                            `
                                : ""
                            }

                            <div class="checkin-date">
                                Last checked in: ${formatDate(checkin.lastCheckInDate)}
                            </div>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;
}

window.addEventListener("load", (event) => {
  data = localStorage.getItem("data");
  if (data) {
    renderCheckins(JSON.parse(data));
    loadingOverlay.classList.add("hide");
  } else {
    loginDialog.showModal();
  }
});
