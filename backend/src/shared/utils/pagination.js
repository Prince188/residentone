/**
 * Standardized pagination parser and metadata builder for ResidentOne API
 */
function parsePagination(query = {}, defaultLimit = 20, maxLimit = 100) {
  // If explicitly requested all items (e.g. for Excel exports or full selector lists)
  if (query.all === true || query.all === "true" || query.all === "1") {
    return {
      page: 1,
      limit: null,
      skip: 0,
      isAll: true,
    };
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    isAll: false,
  };
}

function buildPaginationMeta(totalCount, page = 1, limit = 20) {
  if (!limit) {
    return {
      page: 1,
      limit: totalCount,
      totalCount,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;
  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
