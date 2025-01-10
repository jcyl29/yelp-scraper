import { formatDate, getGoogleMapsSearchUrl } from "./appUtils.js";

const renderCheckinGrid = (checkins) => {
  const gridSelector = document.getElementById("data-grid");
  gridSelector.innerHTML = `${checkins
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
                                <a href="${getGoogleMapsSearchUrl({ addressLine: checkin.addressLine1, city: checkin.city, zipCode: checkin.regionCode })}" target="_blank">
                                ${checkin.addressLine1}<br />
                                ${checkin.city}, ${checkin.regionCode}
                                </a>
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
    .join("")}`;
};

export default renderCheckinGrid;
