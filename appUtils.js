export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getFilteredData(filter) {
  const { year, categories: searchCategories } = filter;
  const unfilteredData = JSON.parse(localStorage.getItem("data"));
  if (!year && !searchCategories) {
    return unfilteredData;
  }

  if (year) {
    return unfilteredData.filter((d) => {
      const date = new Date(d.lastCheckInDate);
      return date.getFullYear().toString() === year;
    });
  }

  if (searchCategories) {
    return unfilteredData.filter((d) => {
      const { categories } = d;
      for (let c of categories) {
        if (searchCategories.includes(c)) {
          return true
        }
      }
      return false
    });
  }
}
