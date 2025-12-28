// API utility functions for communicating with the backend
// Use relative URL for Vercel deployment (works both locally and on Vercel)
const API_BASE_URL = '/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        const text = await response.text().catch(() => '');
        errorData = { 
          error: text || `HTTP error! status: ${response.status} ${response.statusText}`,
          status: response.status,
          statusText: response.statusText
        };
      }
      
      const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      error.details = errorData.details || errorData.code || '';
      error.status = response.status;
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    // If API is unavailable, try localStorage fallback
    const errorMsg = error.message || error.toString() || '';
    if (errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('NetworkError') || 
        errorMsg.includes('Network request failed') ||
        error.name === 'TypeError' ||
        error.code === 'ECONNREFUSED') {
      console.warn('API unavailable, using localStorage fallback');
      throw new Error('API_UNAVAILABLE');
    }
    throw error;
  }
}

// Jobs API
const jobsAPI = {
  getAll: () => apiCall('/jobs'),
  getById: (id) => apiCall(`/jobs/${id}`),
  create: (jobData) => apiCall('/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData)
  }),
  update: (id, jobData) => apiCall(`/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(jobData)
  }),
  delete: (id) => apiCall(`/jobs/${id}`, {
    method: 'DELETE'
  })
};

// Reports API
const reportsAPI = {
  getAll: () => apiCall('/reports'),
  getById: (id) => apiCall(`/reports/${id}`),
  getByJobId: (jobId) => apiCall(`/reports/job/${jobId}`),
  create: (reportData) => apiCall('/reports', {
    method: 'POST',
    body: JSON.stringify(reportData)
  }),
  update: (id, reportData) => apiCall(`/reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify(reportData)
  }),
  delete: (id) => apiCall(`/reports/${id}`, {
    method: 'DELETE'
  })
};

// Techs API
const techsAPI = {
  getAll: () => apiCall('/techs'),
  getById: (id) => apiCall(`/techs/${id}`),
  create: (techData) => apiCall('/techs', {
    method: 'POST',
    body: JSON.stringify(techData)
  }),
  update: (id, techData) => apiCall(`/techs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(techData)
  }),
  delete: (id) => apiCall(`/techs/${id}`, {
    method: 'DELETE',
    method: 'DELETE'
  })
};

// Fallback to localStorage if API is unavailable
async function jobsAPIGetAllWithFallback() {
  try {
    return await jobsAPI.getAll();
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for jobs');
      return JSON.parse(localStorage.getItem('scheduledJobs') || '[]');
    }
    throw error;
  }
}

async function jobsAPICreateWithFallback(jobData) {
  try {
    return await jobsAPI.create(jobData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for job creation');
      const jobs = JSON.parse(localStorage.getItem('scheduledJobs') || '[]');
      const newJob = {
        ...jobData,
        id: jobData.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: jobData.createdAt || new Date().toISOString()
      };
      jobs.push(newJob);
      localStorage.setItem('scheduledJobs', JSON.stringify(jobs));
      return newJob;
    }
    throw error;
  }
}

async function jobsAPIUpdateWithFallback(id, jobData) {
  try {
    return await jobsAPI.update(id, jobData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for job update');
      const jobs = JSON.parse(localStorage.getItem('scheduledJobs') || '[]');
      const index = jobs.findIndex(j => j.id === id);
      if (index === -1) throw new Error('Job not found');
      jobs[index] = { ...jobs[index], ...jobData, id, updatedAt: new Date().toISOString() };
      localStorage.setItem('scheduledJobs', JSON.stringify(jobs));
      return jobs[index];
    }
    throw error;
  }
}

async function reportsAPIGetAllWithFallback() {
  try {
    return await reportsAPI.getAll();
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for reports');
      return JSON.parse(localStorage.getItem('wellReports') || '[]');
    }
    throw error;
  }
}

async function reportsAPICreateWithFallback(reportData) {
  try {
    return await reportsAPI.create(reportData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for report creation');
      
      // Remove photos from report data for localStorage (photos are too large for localStorage)
      // Store only photo metadata (caption, order) but not the base64 data
      const reportDataForStorage = { ...reportData };
      if (reportDataForStorage.photos && Array.isArray(reportDataForStorage.photos)) {
        reportDataForStorage.photos = reportDataForStorage.photos.map(photo => ({
          caption: photo.caption || '',
          order: photo.order || 0,
          // Don't store the base64 URL - it's too large
          url: null
        }));
      }
      
      const reports = JSON.parse(localStorage.getItem('wellReports') || '[]');
      const newReport = {
        ...reportDataForStorage,
        id: reportData.id || `report-${Date.now()}`,
        createdAt: reportData.createdAt || new Date().toISOString(),
        _photosExcluded: true // Flag to indicate photos were excluded
      };
      
      try {
        reports.push(newReport);
        localStorage.setItem('wellReports', JSON.stringify(reports));
        return newReport;
      } catch (storageError) {
        if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
          // Try to clean up old reports and retry
          console.warn('localStorage quota exceeded, attempting cleanup...');
          const cleanedReports = reports.slice(-10); // Keep only last 10 reports
          localStorage.setItem('wellReports', JSON.stringify(cleanedReports));
          
          // Retry with cleaned data
          cleanedReports.push(newReport);
          try {
            localStorage.setItem('wellReports', JSON.stringify(cleanedReports));
            return newReport;
          } catch (retryError) {
            throw new Error('localStorage is full. Please start the backend server or clear browser storage. Photos cannot be saved in localStorage.');
          }
        }
        throw storageError;
      }
    }
    throw error;
  }
}

async function reportsAPIUpdateWithFallback(id, reportData) {
  try {
    return await reportsAPI.update(id, reportData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for report update');
      
      // Remove photos from report data for localStorage (photos are too large for localStorage)
      const reportDataForStorage = { ...reportData };
      if (reportDataForStorage.photos && Array.isArray(reportDataForStorage.photos)) {
        reportDataForStorage.photos = reportDataForStorage.photos.map(photo => ({
          caption: photo.caption || '',
          order: photo.order || 0,
          url: null // Don't store base64 URL
        }));
      }
      
      const reports = JSON.parse(localStorage.getItem('wellReports') || '[]');
      const index = reports.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Report not found');
      
      reports[index] = { 
        ...reports[index], 
        ...reportDataForStorage, 
        id, 
        updatedAt: new Date().toISOString(),
        _photosExcluded: true
      };
      
      try {
        localStorage.setItem('wellReports', JSON.stringify(reports));
        return reports[index];
      } catch (storageError) {
        if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
          // Try to clean up old reports and retry
          console.warn('localStorage quota exceeded, attempting cleanup...');
          const cleanedReports = reports.slice(-10); // Keep only last 10 reports
          localStorage.setItem('wellReports', JSON.stringify(cleanedReports));
          
          // Find the report again after cleanup
          const newIndex = cleanedReports.findIndex(r => r.id === id);
          if (newIndex === -1) {
            // Report was removed in cleanup, add it back
            cleanedReports.push(reports[index]);
            localStorage.setItem('wellReports', JSON.stringify(cleanedReports));
            return cleanedReports[cleanedReports.length - 1];
          } else {
            localStorage.setItem('wellReports', JSON.stringify(cleanedReports));
            return cleanedReports[newIndex];
          }
        }
        throw storageError;
      }
    }
    throw error;
  }
}

// Fallback for getById
async function jobsAPIGetByIdWithFallback(id) {
  try {
    return await jobsAPI.getById(id);
  } catch (error) {
    const errorMsg = error.message || error.toString() || '';
    // If 404 or API unavailable, try getting all jobs and filtering client-side
    if (error.status === 404 || 
        errorMsg === 'API_UNAVAILABLE' || 
        errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('Network request failed') ||
        errorMsg.includes('HTTP error! status: 404')) {
      console.warn('Job by ID endpoint failed, trying to get all jobs and filter:', errorMsg);
      try {
        // /api/jobs works, so use it and filter client-side
        const allJobs = await jobsAPI.getAll();
        console.log(`Got ${allJobs.length} jobs, filtering for ID: ${id}`);
        const job = allJobs.find(j => j.id === id);
        if (job) {
          console.log('Found job by filtering all jobs:', job.id);
          return job;
        }
        console.error('Job not found in all jobs. Available IDs:', allJobs.map(j => j.id));
      } catch (fallbackError) {
        console.error('Failed to get all jobs as fallback:', fallbackError);
      }
      
      // Last resort: localStorage
      console.warn('Using localStorage fallback for job getById');
      const jobs = JSON.parse(localStorage.getItem('scheduledJobs') || '[]');
      const job = jobs.find(j => j.id === id);
      if (!job) {
        console.error('Job not found in localStorage for ID:', id);
        throw new Error('Job not found');
      }
      console.log('Job found in localStorage:', job);
      return job;
    }
    throw error;
  }
}

// Fallback for reports getById
async function reportsAPIGetByIdWithFallback(id) {
  try {
    return await reportsAPI.getById(id);
  } catch (error) {
    const errorMsg = error.message || error.toString() || '';
    // If 404 or API unavailable, try getting all reports and filtering client-side
    if (error.status === 404 || 
        errorMsg === 'API_UNAVAILABLE' || 
        errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('Network request failed') ||
        errorMsg.includes('HTTP error! status: 404')) {
      console.warn('Report by ID endpoint failed, trying to get all reports and filter:', errorMsg);
      try {
        // /api/reports works, so use it and filter client-side
        const allReports = await reportsAPI.getAll();
        console.log(`Got ${allReports.length} reports, filtering for ID: ${id}`);
        const report = allReports.find(r => r.id === id || r.job_id === id);
        if (report) {
          console.log('Found report by filtering all reports:', report.id);
          return report;
        }
        console.error('Report not found in all reports. Available IDs:', allReports.map(r => r.id));
      } catch (fallbackError) {
        console.error('Failed to get all reports as fallback:', fallbackError);
      }
      
      // Last resort: localStorage
      console.warn('Using localStorage fallback for report getById');
      const reports = JSON.parse(localStorage.getItem('wellReports') || '[]');
      console.log('Reports in localStorage:', reports.length, 'Looking for ID:', id);
      const report = reports.find(r => r.id === id);
      if (!report) {
        console.error('Report not found in localStorage. Available IDs:', reports.map(r => r.id));
        throw new Error('Report not found');
      }
      console.log('Report found in localStorage:', report);
      return report;
    }
    throw error;
  }
}

// Make APIs available globally
window.jobsAPI = {
  getAll: jobsAPIGetAllWithFallback,
  getById: jobsAPIGetByIdWithFallback,
  create: jobsAPICreateWithFallback,
  update: jobsAPIUpdateWithFallback,
  delete: jobsAPI.delete
};

// Fallback for reports getByJobId
async function reportsAPIGetByJobIdWithFallback(jobId) {
  try {
    const result = await reportsAPI.getByJobId(jobId);
    // Handle both single report and array response
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result;
  } catch (error) {
    const errorMsg = error.message || error.toString() || '';
    // If 404 or API unavailable, try getting all reports and filtering client-side
    if (error.status === 404 || 
        errorMsg === 'API_UNAVAILABLE' || 
        errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('Network request failed') ||
        errorMsg.includes('HTTP error! status: 404')) {
      console.warn('Report by jobId endpoint failed, trying to get all reports and filter:', errorMsg);
      try {
        // /api/reports works, so use it and filter client-side
        const allReports = await reportsAPI.getAll();
        console.log(`Got ${allReports.length} reports, filtering for jobId: ${jobId}`);
        const report = allReports.find(r => r.jobId === jobId || r.job_id === jobId);
        if (report) {
          console.log('Found report by filtering all reports:', report.id);
          return report;
        }
        console.error('Report not found in all reports for jobId:', jobId);
        // Return null instead of throwing - let the caller handle it
        return null;
      } catch (fallbackError) {
        console.error('Failed to get all reports as fallback:', fallbackError);
      }
      
      // Last resort: localStorage
      console.warn('Using localStorage fallback for report getByJobId');
      const reports = JSON.parse(localStorage.getItem('wellReports') || '[]');
      const report = reports.find(r => r.jobId === jobId || r.job_id === jobId);
      if (!report) {
        console.error('Report not found in localStorage for jobId:', jobId);
        return null;
      }
      console.log('Report found in localStorage:', report);
      return report;
    }
    throw error;
  }
}

window.reportsAPI = {
  getAll: reportsAPIGetAllWithFallback,
  getById: reportsAPIGetByIdWithFallback,
  getByJobId: reportsAPIGetByJobIdWithFallback,
  create: reportsAPICreateWithFallback,
  update: reportsAPIUpdateWithFallback,
  delete: reportsAPI.delete
};

// Techs API with localStorage fallback
async function techsAPIGetAllWithFallback() {
  try {
    return await techsAPI.getAll();
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for techs');
      let techs = JSON.parse(localStorage.getItem('techs') || '[]');
      
      // Initialize with default techs if empty
      if (techs.length === 0) {
        techs = [
          { id: 'tech-1', name: 'Rich', email: 'rich@aquaterra.com', active: true },
          { id: 'tech-2', name: 'Jeff', email: 'jeff@aquaterra.com', active: true },
          { id: 'tech-3', name: 'Michael', email: 'msjbco@gmail.com', active: true }
        ];
        localStorage.setItem('techs', JSON.stringify(techs));
      }
      
      return techs;
    }
    throw error;
  }
}

async function techsAPICreateWithFallback(techData) {
  try {
    return await techsAPI.create(techData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for tech creation');
      const techs = JSON.parse(localStorage.getItem('techs') || '[]');
      const newTech = {
        ...techData,
        id: techData.id || `tech-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        active: techData.active !== undefined ? techData.active : true
      };
      techs.push(newTech);
      localStorage.setItem('techs', JSON.stringify(techs));
      return newTech;
    }
    throw error;
  }
}

async function techsAPIUpdateWithFallback(id, techData) {
  try {
    return await techsAPI.update(id, techData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for tech update');
      const techs = JSON.parse(localStorage.getItem('techs') || '[]');
      const index = techs.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Tech not found');
      techs[index] = { ...techs[index], ...techData, id, updatedAt: new Date().toISOString() };
      localStorage.setItem('techs', JSON.stringify(techs));
      return techs[index];
    }
    throw error;
  }
}

async function techsAPIDeleteWithFallback(id) {
  try {
    return await techsAPI.delete(id);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for tech delete');
      const techs = JSON.parse(localStorage.getItem('techs') || '[]');
      const filteredTechs = techs.filter(t => t.id !== id);
      if (filteredTechs.length === techs.length) throw new Error('Tech not found');
      localStorage.setItem('techs', JSON.stringify(filteredTechs));
      return { success: true };
    }
    throw error;
  }
}

window.techsAPI = {
  getAll: techsAPIGetAllWithFallback,
  getById: techsAPI.getById,
  create: techsAPICreateWithFallback,
  update: techsAPIUpdateWithFallback,
  delete: techsAPIDeleteWithFallback
};

// Class Requests API
const classRequestsAPI = {
  getAll: () => apiCall('/class-requests'),
  getById: (id) => apiCall(`/class-requests/${id}`),
  create: (classRequestData) => apiCall('/class-requests', {
    method: 'POST',
    body: JSON.stringify(classRequestData)
  }),
  update: (id, classRequestData) => apiCall(`/class-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(classRequestData)
  }),
  delete: (id) => apiCall(`/class-requests/${id}`, {
    method: 'DELETE'
  })
};

async function classRequestsAPIGetAllWithFallback() {
  try {
    return await classRequestsAPI.getAll();
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for class requests');
      return JSON.parse(localStorage.getItem('classRequests') || '[]');
    }
    throw error;
  }
}

async function classRequestsAPICreateWithFallback(classRequestData) {
  try {
    return await classRequestsAPI.create(classRequestData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for class request create');
      const classRequests = JSON.parse(localStorage.getItem('classRequests') || '[]');
      const newClassRequest = {
        ...classRequestData,
        id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: classRequestData.createdAt || new Date().toISOString(),
        confirmed: classRequestData.confirmed !== undefined ? classRequestData.confirmed : false
      };
      classRequests.push(newClassRequest);
      localStorage.setItem('classRequests', JSON.stringify(classRequests));
      console.log('Saved class request to localStorage:', newClassRequest);
      console.log('Total class requests in localStorage:', classRequests.length);
      return newClassRequest;
    }
    throw error;
  }
}

async function classRequestsAPIUpdateWithFallback(id, classRequestData) {
  try {
    return await classRequestsAPI.update(id, classRequestData);
  } catch (error) {
    if (error.message === 'API_UNAVAILABLE') {
      console.warn('Using localStorage fallback for class request update');
      const classRequests = JSON.parse(localStorage.getItem('classRequests') || '[]');
      const index = classRequests.findIndex(cr => cr.id === id);
      if (index === -1) throw new Error('Class request not found');
      classRequests[index] = { ...classRequests[index], ...classRequestData, id, updatedAt: new Date().toISOString() };
      localStorage.setItem('classRequests', JSON.stringify(classRequests));
      return classRequests[index];
    }
    throw error;
  }
}

window.classRequestsAPI = {
  getAll: classRequestsAPIGetAllWithFallback,
  getById: classRequestsAPI.getById,
  create: classRequestsAPICreateWithFallback,
  update: classRequestsAPIUpdateWithFallback,
  delete: classRequestsAPI.delete
};

