import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, projectService } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Plus, Sparkles, LogOut, Settings, Folder, Trash2, Calendar, ExternalLink, Share2, Rocket } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    llm_provider: 'openai',
    llm_model: 'gpt-5.2',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.getMe();
        setUser(userData);
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const project = await projectService.createProject(newProject);
      toast.success('Project created!');
      setIsCreateDialogOpen(false);
      setNewProject({ name: '', description: '', llm_provider: 'openai', llm_model: 'gpt-5.2' });
      navigate(`/builder/${project.project_id}`);
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await projectService.deleteProject(projectId);
      setProjects(projects.filter(p => p.project_id !== projectId));
      toast.success('Project deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete project');
    }
  };

  const handleShareProject = async (projectId, e) => {
    e.stopPropagation();
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/share`,
        {},
        { withCredentials: true }
      );

      const shareUrl = `${window.location.origin}${response.data.share_url}`;
      await navigator.clipboard.writeText(shareUrl);
      
      toast.success('Share link copied to clipboard!');
      
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create share link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-600" />
              <span className="text-xl font-heading font-bold">MetaBuilder</span>
            </div>
            <nav className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-zinc-400 hover:text-white"
                onClick={() => navigate('/templates')}
                data-testid="nav-templates-btn"
              >
                Templates
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/settings')}
              className="text-zinc-400 hover:text-white"
              data-testid="nav-settings-btn"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-zinc-400 hover:text-white"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-3">
            Welcome back, {user?.name}
          </h1>
          <p className="text-zinc-400 text-lg">Continue building or start a new project</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <div 
                className="border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-violet-600 hover:bg-zinc-900/30 transition-all h-64 group"
                data-testid="create-project-card"
              >
                <div className="w-16 h-16 bg-violet-600/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-violet-600/20 transition-colors">
                  <Plus className="w-8 h-8 text-violet-600" />
                </div>
                <h3 className="text-xl font-heading font-medium mb-2">New Project</h3>
                <p className="text-zinc-500 text-sm text-center">Start building something amazing</p>
              </div>
            </DialogTrigger>

            <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-heading">Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="project-name" className="text-zinc-300 mb-2 block">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="My Awesome App"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    required
                    className="bg-zinc-900 border-zinc-800 focus:border-violet-500"
                    data-testid="project-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="project-description" className="text-zinc-300 mb-2 block">Description (optional)</Label>
                  <Input
                    id="project-description"
                    placeholder="What does your app do?"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 focus:border-violet-500"
                    data-testid="project-description-input"
                  />
                </div>

                <div>
                  <Label htmlFor="llm-provider" className="text-zinc-300 mb-2 block">AI Provider</Label>
                  <Select
                    value={newProject.llm_provider}
                    onValueChange={(value) =>
                      setNewProject({ ...newProject, llm_provider: value, llm_model: 'gpt-5.2' })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800" data-testid="llm-provider-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-violet-600 hover:bg-violet-700 py-3"
                  data-testid="create-project-submit-btn"
                >
                  Create Project
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {projects.map((project) => (
            <div
              key={project.project_id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-600 hover:bg-zinc-900/80 transition-all flex flex-col group relative"
              data-testid={`project-card-${project.project_id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-violet-600/10 rounded-lg flex items-center justify-center group-hover:bg-violet-600/20 transition-colors">
                  <Folder className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex gap-1">
                  {project.deployment_url && (
                    <span className="px-2 py-1 bg-green-600/10 text-green-400 text-xs rounded-full border border-green-600/30">
                      Deployed
                    </span>
                  )}
                  {project.shareable && (
                    <span className="px-2 py-1 bg-blue-600/10 text-blue-400 text-xs rounded-full border border-blue-600/30">
                      Shared
                    </span>
                  )}
                </div>
              </div>

              <h3 
                className="text-xl font-heading font-medium mb-2 cursor-pointer hover:text-violet-400 transition-colors"
                onClick={() => navigate(`/builder/${project.project_id}`)}
              >
                {project.name}
              </h3>
              
              {project.description && (
                <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-zinc-600 mb-4">
                <Calendar className="w-3 h-3" />
                <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                <span className="ml-auto text-violet-600">{project.llm_provider}</span>
              </div>

              <div className="flex gap-2 mt-auto">
                {project.deployment_url ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(project.deployment_url, '_blank');
                    }}
                    className="flex-1 bg-green-600/10 text-green-400 hover:bg-green-600/20 border border-green-600/30"
                    data-testid={`view-live-${project.project_id}`}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Live
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/builder/${project.project_id}`)}
                    className="flex-1 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    data-testid={`deploy-${project.project_id}`}
                  >
                    <Rocket className="w-3 h-3 mr-1" />
                    Deploy
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => handleShareProject(project.project_id, e)}
                  className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  data-testid={`share-${project.project_id}`}
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  Share
                </Button>

                <button
                  onClick={(e) => handleDeleteProject(project.project_id, e)}
                  className="text-zinc-500 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  data-testid={`delete-project-${project.project_id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

