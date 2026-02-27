const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { readJsonArray, writeJsonArray } = require('../utils/dataStore');
const { validateProjectPayload } = require('../utils/validators');
const { sendError } = require('../utils/http');
const router = express.Router();

async function readProjects() {
  return await readJsonArray('projects.json');
}

async function writeProjects(data) {
  await writeJsonArray('projects.json', data);
}

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
  const tech = Array.isArray(project.tech)
    ? project.tech
    : (Array.isArray(project.techStack) ? project.techStack : []);

  return {
    ...project,
    tech,
    techStack: tech
  };
}

// GET all projects
router.get('/', async (req, res) => {
  const projects = await readProjects();
  res.json(projects.map(normalizeProject));
});

// GET single project
router.get('/:id', async (req, res) => {
  const projects = await readProjects();
  const project = projects.find(p => String(p.id) === String(req.params.id));
  if (!project) return sendError(res, 404, 'Project not found');
  res.json(normalizeProject(project));
});

// POST create project
router.post('/', requireAdmin, async (req, res) => {
  const validation = validateProjectPayload(req.body, { partial: false });
  if (!validation.ok) return sendError(res, 400, validation.error);

  try {
    const { title, description, tech, techStack, role, impact, github, demo, category } = req.body;

    const incomingTech = Array.isArray(tech) ? tech : (Array.isArray(techStack) ? techStack : []);
    const safeTech = incomingTech.map(t => sanitizeString(t)).filter(Boolean).slice(0, 30);
    const projects = await readProjects();
    const newProject = {
      id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
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
    projects.push(newProject);
    await writeProjects(projects);
    res.status(201).json(normalizeProject(newProject));
  } catch {
    sendError(res, 500, 'Failed to store project');
  }
});

// PUT update project
router.put('/:id', requireAdmin, async (req, res) => {
  const validation = validateProjectPayload(req.body, { partial: true });
  if (!validation.ok) return sendError(res, 400, validation.error);

  try {
    const projects = await readProjects();
    const idx = projects.findIndex(p => String(p.id) === String(req.params.id));
    if (idx === -1) return sendError(res, 404, 'Project not found');
    const { title, description, tech, techStack, role, impact, github, demo, category } = req.body;
    const current = normalizeProject(projects[idx]);
    const incomingTech = Array.isArray(tech) ? tech : (Array.isArray(techStack) ? techStack : null);
    const safeTech = incomingTech ? incomingTech.map(t => sanitizeString(t)).filter(Boolean).slice(0, 30) : current.tech;

    projects[idx] = {
      ...current,
      title: sanitizeString(title || current.title),
      description: sanitizeString(description || current.description),
      tech: safeTech,
      techStack: safeTech,
      role: sanitizeString(role || current.role),
      impact: sanitizeString(impact !== undefined ? impact : current.impact),
      github: github !== undefined ? sanitizeUrl(github) : current.github,
      demo: demo !== undefined ? sanitizeUrl(demo) : current.demo,
      category: sanitizeString(category || current.category)
    };
    await writeProjects(projects);
    res.json(normalizeProject(projects[idx]));
  } catch {
    sendError(res, 500, 'Failed to update project');
  }
});

// DELETE project
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const projects = await readProjects();
    const idx = projects.findIndex(p => String(p.id) === String(req.params.id));
    if (idx === -1) return sendError(res, 404, 'Project not found');
    const deleted = projects.splice(idx, 1)[0];
    await writeProjects(projects);
    res.json(normalizeProject(deleted));
  } catch {
    sendError(res, 500, 'Failed to delete project');
  }
});

module.exports = router;
