// k6 Load Testing Script for Portfolio API
// Run with: k6 run tests/load-test.js
// Install k6: https://k6.io/docs/get-started/installation/

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '3m', target: 10 },   // Stay at 10 users
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '3m', target: 20 },   // Stay at 20 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.1'],     // Less than 10% errors
    errors: ['rate<0.1'],              // Custom error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Helper functions
function checkResponse(response, name) {
  const success = check(response, {
    [`${name} status is 200`]: (r) => r.status === 200,
    [`${name} response time < 1000ms`]: (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  return success;
}

export default function () {
  // Test 1: Health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  checkResponse(healthRes, 'Health Check');
  sleep(1);

  // Test 2: Get projects (paginated)
  const projectsRes = http.get(`${BASE_URL}/api/projects?page=1&limit=10`);
  checkResponse(projectsRes, 'Get Projects');
  
  // Parse and check projects data
  check(projectsRes, {
    'Projects response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });
  sleep(1);

  // Test 3: Get single project (if projects exist)
  try {
    const projectsBody = JSON.parse(projectsRes.body);
    if (projectsBody.data && projectsBody.data.length > 0) {
      const projectId = projectsBody.data[0].id;
      const projectRes = http.get(`${BASE_URL}/api/projects/${projectId}`);
      checkResponse(projectRes, 'Get Single Project');
    }
  } catch (e) {
    console.log('No projects to test single project endpoint');
  }
  sleep(1);

  // Test 4: Get meta info
  const metaRes = http.get(`${BASE_URL}/api/meta`);
  checkResponse(metaRes, 'Get Meta');
  sleep(1);

  // Test 5: Simulate contact form submission (with rate limit awareness)
  const contactPayload = {
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Load Test',
    message: 'This is a test message from k6 load testing',
    _timestamp: Date.now() - 5000, // 5 seconds ago to pass honeypot
  };
  
  const contactRes = http.post(
    `${BASE_URL}/api/contact`,
    JSON.stringify(contactPayload),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  // Contact endpoint may return 429 (rate limited) which is expected
  check(contactRes, {
    'Contact form accepted or rate limited': (r) => 
      r.status === 201 || r.status === 429,
  });
  sleep(2);

  // Test 6: Static file serving
  const staticRes = http.get(`${BASE_URL}/`);
  checkResponse(staticRes, 'Static Files');
  sleep(1);
}

// Setup function - runs once before all VUs
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  
  // Verify target is reachable
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error(`Target ${BASE_URL} is not reachable. Status: ${healthCheck.status}`);
    return { skip: true };
  }
  
  console.log('Target is healthy, starting load test...');
  return { skip: false };
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  if (data.skip) {
    console.log('Test was skipped due to unreachable target');
    return;
  }
  
  console.log('Load test completed');
}
