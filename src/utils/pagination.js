export const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, Number(query.page || 1) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit || defaultLimit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const paginatedResult = ({ items, total, page, limit }) => ({
  items,
  pagination: {
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  },
});
