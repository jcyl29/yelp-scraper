import { renderSubHeader } from "./subheader.js";
import renderCheckinGrid from "./checkinGrid.js";

const loginDialog = document.getElementById("loginDialog");
const mainContent = document.getElementById("mainContent");

export function refreshData() {
  // Clear existing data
  mainContent.innerHTML = "";

  // Show the login dialog again
  loginDialog.showModal();
}

export function renderApp(checkins) {
  mainContent.innerHTML = `
            <div class="header" xmlns="http://www.w3.org/1999/html">
                <h1>Your Yelp Check-ins</h1>
                <button class="btn btn-muted" onclick="refreshData()">Refresh Data</button>
                <div class="stats">${checkins.length} total businesses visited</div>                
            </div>
            ${renderSubHeader()}
            <div id="data-grid" class="checkin-grid"></div>
            `;

  renderCheckinGrid(checkins)
}


