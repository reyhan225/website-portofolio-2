const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { 
  getProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject 
} = require('../utils/dataStore');
const { validateProjectPayload } = require('../utils/validators');
const { sendError } = require('../utils/http');
const router = express.Router();

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 1000);
}

function sanitizeUrl(value) {
  const raw = sanitizeString(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return '';
  } catch {
    return '';
  }
}

function normalizeProject(project) {
  if (!project) return null;
  
  const tech = Array.isArray(project.tech)
    ? project.tech
    : (Array.isArray(project.techStack) ? project.techStack : []);

  // Convert Firestore timestamps to ISO strings
  const createdAt = project.createdAt?.toDate?.() 
    ? project.createdAt.toDate().toISOString() 
    : project.createdAt;
    
  const updatedAt = project.updatedAt?.toDate?.() 
    ? project.updatedAt.toDate().toISOString() 
    : project.updatedAt;

  return {
    ...project,
    tech,
    techStack: tech,
    createdAt,
    updatedAt
  };
}

// GET all projects with pagination
router.get('/', async (req, res) => {
  try {
    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const category = req.query.category || null;

    const result = await getProjects({ page, limit, category });
    
    res.json({
      success: true,
      data: result.data.map(normalizeProject),
      pagination: result.pagination,
      fromCache: result.fromCache || false
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    sendError(res, 500, 'Failed to fetch projects', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// GET single project
router.get('/:id', async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return sendError(res, 404, 'Project not found');
    res.json({
      success: true,
      data: normalizeProject(project),
      fromCache: project.fromCache || false
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    sendError(res, 500, 'Failed to fetch project', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// POST create project
router.post('/', requireAdmin, async (req, res) => {
  const validation = validateProjectPayload(req.body, { partial: false });
  if (!validation.ok) return sendError(res, 400, validation.error);

  try {
    const { title, description, tech, techStack, role, impact, github, demo, category } = req.body;

    const incomingTech = Array.isArray(tech) ? tech : (Array.isArray(techStack) ? techStack : []);
    const safeTech = incomingTech.map(t => sanitizeString(t)).filter(Boolean).slice(0, 30);

    const projectData = {
      title: sanitizeString(title),
      description: sanitizeString(description),
      tech: safeTech,
      techStack: safeTech,
      role: sanitizeString(role),
      impact: sanitizeString(impact || ''),
      github: sanitizeUrl(github || ''),
      demo: sanitizeUrl(demo || ''),
      category: sanitizeString(category || 'General')
    };

    const newProject = await createProject(projectData);
    
    res.status(201).json({
      success: true,
      data: normalizeProject(newProject)
    });
  } catch (error) {
    console.error('Error creating project:', error);
    sendError(res, 500, 'Failed to create project', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// PUT update project
router.put('/:id', requireAdmin, async (req, res) => {
  const validation = validateProjectPayload(req.body, { partial: true });
  if (!validation.ok) return sendError(res, 400, validation.error);

  try {
    const { title, description, tech, techStack, role, impact, github, demo, category } = req.body;
    
    // First get current project to merge tech arrays properly
    const current = await getProjectById(req.params.id);
    if (!current) return sendError(res, 404, 'Project not found');

    const incomingTech = Array.isArray(tech) ? tech : (Array.isArray(techStack) ? techStack : null);
    const safeTech = incomingTech ? incomingTech.map(t => sanitizeString(t)).filter(Boolean).slice(0, 30) : current.tech;

    const updates = {
      ...(title !== undefined && { title: sanitizeString(title) }),
      ...(description !== undefined && { description: sanitizeString(description) }),
      ...(incomingTech && { tech: safeTech, techStack: safeTech }),
      ...(role !== undefined && { role: sanitizeString(role) }),
      ...(impact !== undefined && { impact: sanitizeString(impact) }),
      ...(github !== undefined && { github: sanitizeUrl(github) }),
      ...(demo !== undefined && { demo: sanitizeUrl(demo) }),
      ...(category !== undefined && { category: sanitizeString(category) })
    };

    const updated = await updateProject(req.params.id, updates);
    
    res.json({
      success: true,
      data: normalizeProject(updated)
    });
  } catch (error) {
    console.error('Error updating project:', error);
    sendError(res, 500, 'Failed to update project', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// DELETE project
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Verify project exists first
    const project = await getProjectById(req.params.id);
    if (!project) return sendError(res, 404, 'Project not found');
    
    await deleteProject(req.params.id);
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    sendError(res, 500, 'Failed to delete project', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

module.exports = router;
