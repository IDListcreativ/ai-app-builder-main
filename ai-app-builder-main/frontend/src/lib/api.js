import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  async handleOAuthSession(sessionId) {
    const response = await api.post('/auth/session', null, {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  },

  async register(email, password, name) {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const projectService = {
  async getProjects() {
    const response = await api.get('/projects');
    return response.data;
  },

  async createProject(data) {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async getProject(projectId) {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  async deleteProject(projectId) {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  async getMessages(projectId) {
    const response = await api.get(`/projects/${projectId}/messages`);
    return response.data;
  },

  async getFiles(projectId) {
    const response = await api.get(`/projects/${projectId}/files`);
    return response.data;
  },

  async generateCode(projectId, prompt) {
    const response = await api.post('/generate', { project_id: projectId, prompt });
    return response.data;
  },
};

export const templateService = {
  async getTemplates() {
    const response = await api.get('/templates');
    return response.data;
  },
};

export const githubService = {
  async getAuthUrl() {
    const response = await api.get('/github/auth-url');
    return response.data;
  },

  async handleCallback(code) {
    const response = await api.post('/github/callback', null, {
      params: { code },
    });
    return response.data;
  },

  async getStatus() {
    const response = await api.get('/github/status');
    return response.data;
  },

  async exportToGitHub(projectId, repoName, isPrivate, existingRepo = null) {
    const response = await api.post('/github/export', {
      project_id: projectId,
      repo_name: repoName,
      is_private: isPrivate,
      existing_repo: existingRepo,
    });
    return response.data;
  },

  async listRepos() {
    const response = await api.get('/github/repos');
    return response.data;
  },
};
