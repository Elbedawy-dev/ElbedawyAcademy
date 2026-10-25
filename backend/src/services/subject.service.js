import Subject from '../models/Subject.js';

export async function listActiveSubjects(query = {}) {
  const filter = { isActive: true };
  if (query.type) {
    filter.type = query.type;
  }
  const subjects = await Subject.find(filter)
    .sort({ order: 1, createdAt: 1 })
    .select('name slug type gradeLevels order');

  return subjects.map((s) => ({
    id: String(s._id),
    name: s.name,
    slug: s.slug,
    type: s.type,
    gradeLevels: s.gradeLevels || [],
    order: s.order || 0,
  }));
}

export default { listActiveSubjects };
