function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(email) {
  // First check basic email format
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return false;
  }
  // Then check for Gmail domain (case insensitive)
  const emailLower = email.toLowerCase();
  if (!emailLower.endsWith('@gmail.com')) {
    return false;
  }
  return true;
}

function validateLoginPayload(body) {
  const password = body ? body.password : undefined;
  if (!isNonEmptyString(password)) {
    return { ok: false, error: 'password is required' };
  }
  if (password.trim().length > 200) {
    return { ok: false, error: 'password is too long' };
  }
  return { ok: true };
}

function validateProjectPayload(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  const requiredFields = ['title', 'description', 'role'];
  if (!partial) {
    for (const field of requiredFields) {
      if (!isNonEmptyString(body[field])) {
        return { ok: false, error: `${field} is required` };
      }
    }
  }

  const stringFields = ['title', 'description', 'role', 'impact', 'github', 'demo', 'category'];
  for (const field of stringFields) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      return { ok: false, error: `${field} must be a string` };
    }
  }

  const tech = body.tech !== undefined ? body.tech : body.techStack;
  if (tech !== undefined && !Array.isArray(tech)) {
    return { ok: false, error: 'tech must be an array of strings' };
  }
  if (Array.isArray(tech) && tech.some(item => typeof item !== 'string')) {
    return { ok: false, error: 'tech must be an array of strings' };
  }

  if (isNonEmptyString(body.title) && body.title.trim().length > 180) {
    return { ok: false, error: 'title is too long' };
  }
  if (isNonEmptyString(body.description) && body.description.trim().length > 3000) {
    return { ok: false, error: 'description is too long' };
  }
  if (isNonEmptyString(body.role) && body.role.trim().length > 200) {
    return { ok: false, error: 'role is too long' };
  }
  if (isNonEmptyString(body.impact) && body.impact.trim().length > 500) {
    return { ok: false, error: 'impact is too long' };
  }
  if (isNonEmptyString(body.category) && body.category.trim().length > 80) {
    return { ok: false, error: 'category is too long' };
  }
  if (Array.isArray(tech) && tech.length > 30) {
    return { ok: false, error: 'tech has too many items' };
  }

  return { ok: true };
}

function validateContactPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  if (!isNonEmptyString(body.name)) return { ok: false, error: 'name is required' };
  if (!isNonEmptyString(body.email)) return { ok: false, error: 'email is required' };
  if (!isNonEmptyString(body.message)) return { ok: false, error: 'message is required' };
  if (!isValidEmail(body.email)) return { ok: false, error: 'Please use a valid Gmail address (@gmail.com)' };
  if (body.subject !== undefined && typeof body.subject !== 'string') {
    return { ok: false, error: 'subject must be a string' };
  }
  if (body.website !== undefined && typeof body.website !== 'string') {
    return { ok: false, error: 'website must be a string' };
  }
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return { ok: false, error: 'Spam detected' };
  }

  if (body.name.trim().length > 120) return { ok: false, error: 'name is too long' };
  if (body.email.trim().length > 200) return { ok: false, error: 'email is too long' };
  if (body.subject && body.subject.trim().length > 200) return { ok: false, error: 'subject is too long' };
  if (body.message.trim().length > 2000) return { ok: false, error: 'message is too long' };

  return { ok: true };
}

module.exports = {
  validateLoginPayload,
  validateProjectPayload,
  validateContactPayload
};
