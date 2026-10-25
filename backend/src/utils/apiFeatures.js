/**
 * Pagination, filtering, searching and sorting helpers for list endpoints.
 *
 * Filters support plain equality (?status=active) and operators using bracket notation
 * (?price[gte]=100&price[lte]=500, ?status[in]=active,paused).
 */

const OPERATORS = ['gte', 'gt', 'lte', 'lt', 'in', 'nin', 'ne'];

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page, limit, total) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function buildSort(sortStr, allowed = [], fallback = '-createdAt') {
  const source = sortStr || fallback;
  const sort = {};
  for (const part of String(source).split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const desc = trimmed.startsWith('-');
    const field = desc ? trimmed.slice(1) : trimmed;
    if (allowed.length && !allowed.includes(field)) continue;
    sort[field] = desc ? -1 : 1;
  }
  if (!Object.keys(sort).length) return buildSort(fallback, [], '-createdAt');
  // Stable ordering for equal keys
  if (!sort._id) sort._id = -1;
  return sort;
}

function castValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export function buildFilter(query = {}, allowedFilters = []) {
  const filter = {};
  for (const key of allowedFilters) {
    const raw = query[key];
    if (raw === undefined || raw === null || raw === '') continue;

    if (typeof raw === 'object' && !Array.isArray(raw) && !(raw instanceof Date)) {
      const condition = {};
      for (const op of OPERATORS) {
        if (raw[op] === undefined) continue;
        if (op === 'in' || op === 'nin') {
          const list = Array.isArray(raw[op]) ? raw[op] : String(raw[op]).split(',');
          condition[`$${op}`] = list.map((v) => castValue(String(v).trim()));
        } else {
          condition[`$${op}`] = castValue(raw[op]);
        }
      }
      if (Object.keys(condition).length) filter[key] = condition;
    } else if (Array.isArray(raw)) {
      filter[key] = { $in: raw.map(castValue) };
    } else {
      filter[key] = castValue(raw);
    }
  }
  return filter;
}

export function buildSearch(term, fields = []) {
  if (!term || !fields.length) return {};
  const regex = new RegExp(escapeRegex(String(term).trim()), 'i');
  return { $or: fields.map((f) => ({ [f]: regex })) };
}

/**
 * Chainable query builder around a mongoose model.
 */
export class APIFeatures {
  constructor(Model, queryString = {}, baseFilter = {}) {
    this.Model = Model;
    this.queryString = queryString;
    this.filterObj = { ...baseFilter };
    this.sortObj = { createdAt: -1, _id: -1 };
    this.pagination = parsePagination(queryString);
    this.populateArg = null;
    this.selectArg = null;
  }

  filter(allowedFilters = []) {
    Object.assign(this.filterObj, buildFilter(this.queryString, allowedFilters));
    return this;
  }

  search(fields = []) {
    const searchFilter = buildSearch(this.queryString.search, fields);
    if (searchFilter.$or) {
      this.filterObj.$and = [...(this.filterObj.$and || []), searchFilter];
    }
    return this;
  }

  sort(allowed = [], fallback = '-createdAt') {
    this.sortObj = buildSort(this.queryString.sort, allowed, fallback);
    return this;
  }

  paginate(options) {
    this.pagination = parsePagination(this.queryString, options);
    return this;
  }

  populate(arg) {
    this.populateArg = arg;
    return this;
  }

  select(arg) {
    this.selectArg = arg;
    return this;
  }

  async exec({ lean = false } = {}) {
    const { page, limit, skip } = this.pagination;
    let q = this.Model.find(this.filterObj).sort(this.sortObj).skip(skip).limit(limit);
    if (this.selectArg) q = q.select(this.selectArg);
    if (this.populateArg) q = q.populate(this.populateArg);
    if (lean) q = q.lean({ virtuals: true });
    const [data, total] = await Promise.all([q, this.Model.countDocuments(this.filterObj)]);
    return { data, meta: buildMeta(page, limit, total) };
  }
}

/**
 * One-shot helper used by most list services.
 */
export async function paginate(
  Model,
  {
    filter = {},
    query = {},
    allowedFilters = [],
    searchFields = [],
    allowedSort = [],
    defaultSort = '-createdAt',
    populate,
    select,
    lean = false,
  } = {},
) {
  const features = new APIFeatures(Model, query, filter)
    .filter(allowedFilters)
    .search(searchFields)
    .sort(allowedSort, defaultSort)
    .paginate();
  if (populate) features.populate(populate);
  if (select) features.select(select);
  return features.exec({ lean });
}

export default APIFeatures;
