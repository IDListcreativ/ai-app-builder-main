import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;
const SESSION_TOKEN_KEY = 'metabuilder_session_token';

const getStoredSessionToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY);
};

const syncAuthHeader = (sessionToken) => {
  if (sessionToken) {
    const authorization = `Bearer ${sessionToken}`;
    axios.defaults.headers.common.Authorization = authorization;
    api.defaults.headers.common.Authorization = authorization;
    return;
  }

  delete axios.defaults.headers.common.Authorization;
  delete api.defaults.headers.common.Authorization;
};

const persistSessionToken = (sessionToken) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  }

  syncAuthHeader(sessionToken);
};

const clearSessionToken = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
  }

  syncAuthHeader(null);
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axios.defaults.withCredentials = true;
syncAuthHeader(getStoredSessionToken());

export const authService = {
  async register(email, password, name) {
    const response = await api.post('/auth/register', { email, password, name });
    if (response.data?.session_token) {
      persistSessionToken(response.data.session_token);
    }
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.session_token) {
      persistSessionToken(response.data.session_token);
    }
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout() {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } finally {
      clearSessionToken();
    }
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
