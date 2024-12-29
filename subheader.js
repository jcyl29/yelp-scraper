import subcategories from "./subcategories.js";
import { getFilteredData } from "./appUtils.js";
import renderCheckinGrid from "./checkinGrid.js";

const getCategoriesFromMenu = (menuName, menuOpt) => {
  return subcategories[menuName][menuOpt];
};

const renderSubHeader = () => `<header class="subheader">
        <nav class="filters-nav">
            <button class="mobile-menu-btn">Filters Menu</button>
            <div class="filters-section">
                <div class="categories-container">
                    ${Object.entries(subcategories)
                      .map(
                        ([menuName, menuOpts]) =>
                          `<div class="select-wrapper">
                            <select class="sub-category">
                                <option value="">${menuName}</option>
                                ${Object.keys(menuOpts).map((o) => `<option value="${o}">${o}</option>`)}
                            </select>
                          </div>`,
                      )
                      .join("")}
                </div>
                <div class="year-filter">
                    <span class="filter-label">Filter by Year:</span>
                    <div class="select-wrapper">
                        <select id="year-select">
                            <option value="">All Years</option>
                        </select>
                    </div>
                    <button class="reset-button">Reset Filters</button>
                </div>
            </div>
        </nav>
    </header>`;

const initSubHeader = (subMenuData) => {
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const filtersSection = document.querySelector(".filters-section");
  const yearSelectMenu = document.querySelector("#year-select");

  for (const year of subMenuData.years) {
    yearSelectMenu.appendChild(new Option(year, year));
  }

  mobileMenuBtn.addEventListener("click", () => {
    mobileMenuBtn.classList.toggle("active");
    filtersSection.classList.toggle("active");
  });

  // Reset button functionality
  const resetButton = document.querySelector(".reset-button");

  resetButton.addEventListener("click", () => {
    // Reset all select elements to their first option
    document.querySelectorAll("select").forEach((select) => {
      select.selectedIndex = 0;
      // Trigger change event for any listeners
      select.dispatchEvent(new Event("change"));
    });
  });

  // Optional: Close mobile menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filters-nav")) {
      mobileMenuBtn.classList.remove("active");
      filtersSection.classList.remove("active");
    }
  });

  // Handle select changes
  document.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", function (e) {
      const { target } = e;
      if (target.id === "year-select") {
        renderCheckinGrid(getFilteredData({ year: this.value }));
      } else if (target.classList.contains("sub-category") && this.value) {
        renderCheckinGrid(
          getFilteredData({
            categories: getCategoriesFromMenu(
              this.options[0].label,
              this.value,
            ),
          }),
        );
      }
    });
  });
};

export { initSubHeader, renderSubHeader };
