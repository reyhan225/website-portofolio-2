const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { 
  getTestimonials, 
  getTestimonialById, 
  createTestimonial, 
  updateTestimonial, 
  deleteTestimonial,
  approveTestimonial 
} = require('../utils/dataStore');
const { validateTestimonialPayload } = require('../utils/validators');
const { sendError } = require('../utils/http');
const router = express.Router();

// Simple honeypot + minimum submit time (shared with contact pattern)
function checkHoneypot(body) {
  if (body.website !== undefined && body.website !== '') {
    return { ok: false, error: 'Spam detected' };
  }
  if (body._timestamp) {
    const submitTime = parseInt(body._timestamp, 10);
    const now = Date.now();
    if (now - submitTime < 3000) {
      return { ok: false, error: 'Form submitted too quickly' };
    }
  }
  return { ok: true };
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 1000);
}

function normalizeTestimonial(testimonial) {
  if (!testimonial) return null;
  
  // Convert Firestore timestamps to ISO strings
  const createdAt = testimonial.createdAt?.toDate?.() 
    ? testimonial.createdAt.toDate().toISOString() 
    : testimonial.createdAt;
    
  const updatedAt = testimonial.updatedAt?.toDate?.() 
    ? testimonial.updatedAt.toDate().toISOString() 
    : testimonial.updatedAt;

  return {
    ...testimonial,
    createdAt,
    updatedAt
  };
}

// POST /api/testimonials - Submit new testimonial (public with moderation)
router.post('/', async (req, res) => {
  try {
    const honeypot = checkHoneypot(req.body || {});
    if (!honeypot.ok) {
      return sendError(res, 400, honeypot.error);
    }

    const { author, position, company, content, rating, email } = req.body;

    // Basic validation
    if (!author || !content || !rating) {
      return sendError(res, 400, 'Missing required fields: author, content, rating');
    }

    if (rating < 1 || rating > 5) {
      return sendError(res, 400, 'Rating must be between 1 and 5');
    }

    if (content.length < 20 || content.length > 1000) {
      return sendError(res, 400, 'Content must be between 20 and 1000 characters');
    }

    // Sanitize inputs
    const sanitized = {
      author: sanitizeString(author),
      position: sanitizeString(position),
      company: sanitizeString(company),
      content: sanitizeString(content),
      email: sanitizeString(email),
      rating: parseInt(rating, 10)
    };

    const testimonial = await createTestimonial({
      ...sanitized,
      approved: false  // Requires admin approval
    });

    res.status(201).json({
      success: true,
      message: 'Testimonial submitted successfully. Awaiting admin approval.',
      data: normalizeTestimonial(testimonial)
    });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    sendError(res, 500, 'Failed to create testimonial');
  }
});

// GET /api/testimonials/admin/pending - Get pending testimonials (admin only)
router.get('/admin/pending', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await getTestimonials({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      approved: false  // Only pending testimonials
    });

    res.json({
      success: true,
      data: result.data.map(normalizeTestimonial),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching pending testimonials:', error);
    sendError(res, 500, 'Failed to fetch pending testimonials');
  }
});

// GET /api/testimonials - Get all approved testimonials (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await getTestimonials({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      approved: true  // Only public approved testimonials
    });

    res.json({
      success: true,
      data: result.data.map(normalizeTestimonial),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    sendError(res, 500, 'Failed to fetch testimonials');
  }
});

// GET /api/testimonials/:id - Get single testimonial (public, if approved)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await getTestimonialById(id);

    if (!testimonial) {
      return sendError(res, 404, 'Testimonial not found');
    }

    if (!testimonial.approved) {
      return sendError(res, 404, 'Testimonial not found');
    }

    res.json({
      success: true,
      data: normalizeTestimonial(testimonial)
    });
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    sendError(res, 500, 'Failed to fetch testimonial');
  }
});

// PUT /api/testimonials/admin/:id - Update testimonial (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { author, position, company, content, rating, approved } = req.body;

    const validationError = validateTestimonialPayload({ 
      author, 
      position, 
      company, 
      content, 
      rating,
      approved 
    });

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const updates = {};
    if (author !== undefined) updates.author = sanitizeString(author);
    if (position !== undefined) updates.position = sanitizeString(position);
    if (company !== undefined) updates.company = sanitizeString(company);
    if (content !== undefined) updates.content = sanitizeString(content);
    if (rating !== undefined) updates.rating = parseInt(rating, 10);
    if (approved !== undefined) updates.approved = Boolean(approved);

    const updatedTestimonial = await updateTestimonial(id, updates);

    if (!updatedTestimonial) {
      return sendError(res, 404, 'Testimonial not found');
    }

    res.json({
      success: true,
      message: 'Testimonial updated successfully',
      data: normalizeTestimonial(updatedTestimonial)
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    sendError(res, 500, 'Failed to update testimonial');
  }
});

// POST /api/testimonials/admin/:id/approve - Approve testimonial (admin only)
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await approveTestimonial(id);

    if (!testimonial) {
      return sendError(res, 404, 'Testimonial not found');
    }

    res.json({
      success: true,
      message: 'Testimonial approved successfully',
      data: normalizeTestimonial(testimonial)
    });
  } catch (error) {
    console.error('Error approving testimonial:', error);
    sendError(res, 500, 'Failed to approve testimonial');
  }
});

// DELETE /api/testimonials/:id - Delete testimonial (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteTestimonial(id);

    if (!deleted) {
      return sendError(res, 404, 'Testimonial not found');
    }

    res.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    sendError(res, 500, 'Failed to delete testimonial');
  }
});

// GET /api/testimonials/admin/pending - Get pending testimonials (admin only)
router.get('/admin/pending', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await getTestimonials({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      approved: false  // Only pending testimonials
    });

    res.json({
      success: true,
      data: result.data.map(normalizeTestimonial),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching pending testimonials:', error);
    sendError(res, 500, 'Failed to fetch pending testimonials');
  }
});

module.exports = router;
