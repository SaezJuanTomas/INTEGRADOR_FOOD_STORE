window.FOOD_STORE_LIST = {
  normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  },

  matches(value, query) {
    const normalizedQuery = this.normalize(query);

    if (!normalizedQuery) {
      return true;
    }

    return this.normalize(value).includes(normalizedQuery);
  },

  getPageCount(totalItems, pageSize) {
    if (totalItems <= 0) {
      return 0;
    }

    return Math.ceil(totalItems / pageSize);
  },

  clampPage(page, totalPages) {
    if (totalPages <= 0) {
      return 1;
    }

    return Math.min(Math.max(page, 1), totalPages);
  },

  getPageItems(items, page, pageSize) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  },
};