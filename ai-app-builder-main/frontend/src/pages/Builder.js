import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService, githubService } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { Send, Sparkles, Code2, Eye, FileCode, Download, ArrowLeft, Loader2, GitCompare, Play, Github, Rocket, ExternalLink, Share2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import axios from 'axios';

const Builder = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('code');
  const [showDiff, setShowDiff] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef(null);
  const chatEndRef = useRef(null);
  const [lastGeneration, setLastGeneration] = useState(null);
  const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepoName, setGithubRepoName] = useState('');
  const [githubIsPrivate, setGithubIsPrivate] = useState(true);
  const [exportingToGithub, setExportingToGithub] = useState(false);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [deployPlatform, setDeployPlatform] = useState('vercel');
  const [deployTarget, setDeployTarget] = useState('production');
  const [deploying, setDeploying] = useState(false);
  const [deploymentSettings, setDeploymentSettings] = useState(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, generating]);

  const checkDeploymentSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/deployment/settings`, {
        withCredentials: true,
      });
      setDeploymentSettings(response.data);
      setDeployPlatform(response.data.preferred_platform || 'vercel');
    } catch (error) {
      console.error('Failed to check deployment settings:', error);
    }
  }, []);

  const checkGitHubStatus = useCallback(async () => {
    try {
      const status = await githubService.getStatus();
      setGithubConnected(status.connected);
    } catch (error) {
      console.error('Failed to check GitHub status:', error);
    }
  }, []);

  const loadProjectData = useCallback(async () => {
    try {
      const [projectData, messagesData, filesData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getMessages(projectId),
        projectService.getFiles(projectId),
      ]);
      
      setProject(projectData);
      setMessages(messagesData);
      setFiles(filesData);
      
      if (filesData.length > 0) {
        setSelectedFile(filesData[0]);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [navigate, projectId]);

  useEffect(() => {
    loadProjectData();
    checkGitHubStatus();
    checkDeploymentSettings();
  }, [checkDeploymentSettings, checkGitHubStatus, loadProjectData]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    const userPrompt = prompt;
    setPrompt('');

    try {
      const response = await projectService.generateCode(projectId, userPrompt);
      await loadProjectData();
      
      if (response.success) {
        setLastGeneration({
          explanation: response.explanation,
          changes_summary: response.changes_summary,
          files_updated: response.files_updated,
          total_files: response.total_files
        });
        
        const created = response.files_updated?.filter(f => f.type === 'created').length || 0;
        const modified = response.files_updated?.filter(f => f.type === 'modified').length || 0;
        
        if (created > 0 || modified > 0) {
          toast.success(
            <div>
              <p className="font-semibold">Code generated!</p>
              <p className="text-sm mt-1">{created} files created, {modified} files modified</p>
            </div>
          );
        } else {
          toast.success('Code generated successfully!');
        }
      }
      
      setPreviewKey(prev => prev + 1);
      setActiveTab('preview');
    } catch (error) {
      console.error('Generation error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to generate code';
      if (errorMsg.includes('Budget has been exceeded')) {
        toast.error(
          <div>
            <p className="font-semibold">LLM budget exceeded</p>
            <p className="text-sm mt-1">Add your own API key in Settings or top up your Emergent LLM balance</p>
          </div>
        );
      } else if (errorMsg.includes('API')) {
        toast.error('API error - check your API keys in Settings');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      
      const zip = new JSZip();
      
      zip.file('README.md', `# ${project.name}\n\n${project.description || 'Built with MetaBuilder'}\n\n## Setup\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n`);
      
      files.forEach(file => {
        zip.file(file.path, file.content);
      });
      
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${project.name.replace(/\\s+/g, '-').toLowerCase()}.zip`);
      
      toast.success('Project exported!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export project');
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const { auth_url } = await githubService.getAuthUrl();
      window.location.href = auth_url;
    } catch (error) {
      console.error('GitHub auth error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to connect GitHub';
      toast.error(errorMsg);
    }
  };

  const handleExportToGitHub = async () => {
    if (!githubRepoName.trim()) {
      toast.error('Please enter a repository name');
      return;
    }

    setExportingToGithub(true);
    try {
      const response = await githubService.exportToGitHub(
        projectId,
        githubRepoName,
        githubIsPrivate
      );
      
      toast.success(
        <div>
          <p className="font-semibold">Exported to GitHub!</p>
          <p className="text-sm mt-1">{response.files_created} files created, {response.files_updated} updated</p>
        </div>
      );
      
      setIsGitHubDialogOpen(false);
      
      window.open(response.repo_url, '_blank');
    } catch (error) {
      console.error('GitHub export error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to export to GitHub';
      toast.error(errorMsg);
    } finally {
      setExportingToGithub(false);
    }
  };

  const handleDeploy = async () => {
    const platform = deployPlatform;
    const isConnected = platform === 'vercel' ? deploymentSettings?.vercel_connected : deploymentSettings?.netlify_connected;
    
    if (!isConnected) {
      toast.error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} not connected. Add your token in Settings.`);
      navigate('/settings');
      return;
    }

    setDeploying(true);
    try {
      const axios = (await import('axios')).default;
      const endpoint = platform === 'vercel' ? '/deployment/deploy-vercel' : '/deployment/deploy-netlify';
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api${endpoint}`,
        {
          project_id: projectId,
          project_name: project.name.replace(/\\s+/g, '-').toLowerCase(),
          target: deployTarget
        },
        { withCredentials: true }
      );

      toast.success(
        <div>
          <p className="font-semibold">Deployed successfully!</p>
          <p className="text-sm mt-1">Your app is live on {platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
        </div>
      );

      setIsDeployDialogOpen(false);
      
      await loadProjectData();
      
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Deploy error:', error);
      const errorMsg = error.response?.data?.detail || 'Deployment failed';
      toast.error(errorMsg);
    } finally {
      setDeploying(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/share`,
        {},
        { withCredentials: true }
      );

      const shareUrl = `${window.location.origin}${response.data.share_url}`;
      
      await navigator.clipboard.writeText(shareUrl);
      
      toast.success(
        <div>
          <p className="font-semibold">Share link ready!</p>
          <p className="text-sm mt-1">Link copied to clipboard</p>
        </div>
      );

      setIsShareDialogOpen(false);
      await loadProjectData();
    } catch (error) {
      console.error('Share error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create share link');
    } finally {
      setSharing(false);
    }
  };

  const generatePreviewHTML = useCallback(() => {
    const appFile = files.find(f => f.path.includes('App.jsx') || f.path.includes('App.js'));
    const componentFiles = files.filter(f => f.path.includes('.jsx') || f.path.includes('.js'));
    
    if (!appFile) {
      return '<html><body style=\"background: #000; color: #888; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;\"><div style=\"text-align: center;\"><h2>No App component found</h2><p>Generate code to see the preview</p></div></body></html>';
    }

    let componentsCode = '';
    componentFiles.forEach(file => {
      if (!file.path.includes('App.jsx') && !file.path.includes('App.js')) {
        const componentName = file.path.split('/').pop().replace('.jsx', '').replace('.js', '');
        componentsCode += `\\n// ${file.path}\\n${file.content}\\n`;
      }
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project?.name || 'Preview'}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef } = React;
    
    ${componentsCode}
    
    ${appFile.content}
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
    `;
    
    return html;
  }, [files, project?.name]);

  useEffect(() => {
    if (files.length > 0 && iframeRef.current && activeTab === 'preview') {
      const html = generatePreviewHTML();
      const iframe = iframeRef.current;
      iframe.srcdoc = html;
    }
  }, [activeTab, files.length, generatePreviewHTML, previewKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl h-16 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="text-zinc-400 hover:text-white"
            data-testid="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <span className="font-heading font-bold text-lg">{project?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedFile?.previous_content && (
            <Button 
              variant="secondary" 
              onClick={() => setShowDiff(!showDiff)}
              className="bg-zinc-800 hover:bg-zinc-700"
              data-testid="toggle-diff-btn"
            >
              <GitCompare className="w-4 h-4 mr-2" />
              {showDiff ? 'Hide' : 'Show'} Diff
            </Button>
          )}
          
          <Dialog open={isGitHubDialogOpen} onOpenChange={setIsGitHubDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="secondary" 
                disabled={files.length === 0}
                className="bg-zinc-800 hover:bg-zinc-700"
                data-testid="github-btn"
              >
                <Github className="w-4 h-4 mr-2" />
                Push to GitHub
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-heading">Export to GitHub</DialogTitle>
              </DialogHeader>
              
              {!githubConnected ? (
                <div className="py-6 text-center">
                  <Github className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                  <p className="text-zinc-400 mb-6">Connect your GitHub account to push code</p>
                  <Button 
                    onClick={handleConnectGitHub}
                    className="bg-violet-600 hover:bg-violet-700"
                    data-testid="connect-github-btn"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    Connect GitHub
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="repo-name" className="text-zinc-300 mb-2 block">Repository Name</Label>
                    <Input
                      id="repo-name"
                      placeholder="my-awesome-app"
                      value={githubRepoName}
                      onChange={(e) => setGithubRepoName(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 focus:border-violet-500"
                      data-testid="repo-name-input"
                    />
                    <p className="text-xs text-zinc-500 mt-1">A new repository will be created</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="private-repo" className="text-zinc-300">Private Repository</Label>
                    <Switch
                      id="private-repo"
                      checked={githubIsPrivate}
                      onCheckedChange={setGithubIsPrivate}
                      data-testid="private-repo-switch"
                    />
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <p className="text-sm text-zinc-400">
                      <strong className="text-white">Files to push:</strong> {files.length}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      Each file will be committed separately. README.md will be auto-generated.
                    </p>
                  </div>

                  <Button 
                    onClick={handleExportToGitHub}
                    disabled={exportingToGithub || !githubRepoName.trim()}
                    className="w-full bg-violet-600 hover:bg-violet-700 py-3"
                    data-testid="push-github-btn"
                  >
                    {exportingToGithub ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Pushing to GitHub...
                      </>
                    ) : (
                      <>
                        <Github className="w-4 h-4 mr-2" />
                        Push to GitHub
                      </>
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="secondary" 
                disabled={files.length === 0}
                className="bg-violet-600 hover:bg-violet-700"
                data-testid="deploy-btn"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Deploy
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-heading">Deploy Your App</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-zinc-300 mb-3 block">Select Platform</Label>
                  <RadioGroup value={deployPlatform} onValueChange={setDeployPlatform}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                      <RadioGroupItem value="vercel" id="vercel" />
                      <Label htmlFor="vercel" className="flex-1 cursor-pointer">
                        <div className="font-semibold">Vercel</div>
                        <div className="text-xs text-zinc-400">Optimized for React & Next.js</div>
                        {deploymentSettings?.vercel_connected && (
                          <div className="text-xs text-green-500 mt-1">✓ Connected</div>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                      <RadioGroupItem value="netlify" id="netlify" />
                      <Label htmlFor="netlify" className="flex-1 cursor-pointer">
                        <div className="font-semibold">Netlify</div>
                        <div className="text-xs text-zinc-400">Great for static sites</div>
                        {deploymentSettings?.netlify_connected && (
                          <div className="text-xs text-green-500 mt-1">✓ Connected</div>
                        )}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-zinc-300 mb-3 block">Deployment Type</Label>
                  <RadioGroup value={deployTarget} onValueChange={setDeployTarget}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-zinc-800">
                      <RadioGroupItem value="production" id="production" />
                      <Label htmlFor="production" className="flex-1 cursor-pointer">
                        <div className="font-semibold">Production</div>
                        <div className="text-xs text-zinc-400">Live deployment with custom domain</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-zinc-800">
                      <RadioGroupItem value="preview" id="preview" />
                      <Label htmlFor="preview" className="flex-1 cursor-pointer">
                        <div className="font-semibold">Preview</div>
                        <div className="text-xs text-zinc-400">Temporary preview URL for testing</div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-300 mb-2">
                    <strong>Deployment Info:</strong>
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1">
                    <li>• Files to deploy: {files.length}</li>
                    <li>• Platform: {deployPlatform.charAt(0).toUpperCase() + deployPlatform.slice(1)}</li>
                    <li>• Target: {deployTarget}</li>
                  </ul>
                  {project?.deployment_url && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1">Last deployment:</p>
                      <a href={project.deployment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                        {project.deployment_url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="w-full bg-violet-600 hover:bg-violet-700 py-3"
                  data-testid="deploy-submit-btn"
                >
                  {deploying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Deploy Now
                    </>
                  )}
                </Button>

                {!deploymentSettings?.[`${deployPlatform}_connected`] && (
                  <p className="text-xs text-center text-amber-500">
                    ⚠️ {deployPlatform.charAt(0).toUpperCase() + deployPlatform.slice(1)} not connected. 
                    <button onClick={() => navigate('/settings')} className="underline ml-1">Add token in Settings</button>
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="secondary" 
                disabled={files.length === 0}
                className="bg-zinc-800 hover:bg-zinc-700"
                data-testid="share-btn"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-heading">Share Your Project</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-300 mb-2">
                    <strong>What happens when you share:</strong>
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1">
                    <li>• Anyone with the link can view your code and live preview</li>
                    <li>• Read-only access - viewers can't edit your project</li>
                    <li>• Includes "Built with MetaBuilder" branding</li>
                    <li>• Great for showcasing your work or getting feedback</li>
                  </ul>
                </div>

                {project?.shareable && (
                  <div className="bg-violet-600/10 border border-violet-600/30 rounded-lg p-4">
                    <p className="text-sm text-green-400 mb-2 font-semibold">✓ Project is already shared</p>
                    <p className="text-xs text-zinc-400">
                      Share link: {window.location.origin}/share/{project.share_slug}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 py-3"
                    data-testid="generate-share-link-btn"
                  >
                    {sharing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        {project?.shareable ? 'Copy Share Link' : 'Generate Share Link'}
                      </>
                    )}
                  </Button>
                </div>

                {project?.shareable && (
                  <div className="text-center">
                    <a
                      href={`/share/${project.share_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:underline text-sm flex items-center justify-center gap-1"
                    >
                      View shared page
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="secondary" 
            onClick={handleExport}
            disabled={files.length === 0}
            className="bg-zinc-800 hover:bg-zinc-700"
            data-testid="export-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download ZIP
          </Button>
        </div>
      </nav>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-zinc-950">
            <div className="p-4 border-b border-zinc-800 flex-shrink-0">
              <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                <Code2 className="w-5 h-5 text-violet-600" />
                Code & Preview
              </h2>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="bg-zinc-900 border-b border-zinc-800 rounded-none px-4 justify-start">
                <TabsTrigger value="code" data-testid="code-tab">
                  <FileCode className="w-4 h-4 mr-2" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="preview" data-testid="preview-tab">
                  <Eye className="w-4 h-4 mr-2" />
                  Live Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="flex-1 overflow-hidden flex m-0">
                <div className="w-64 border-r border-zinc-800 overflow-y-auto bg-zinc-950">
                  {files.length === 0 ? (
                    <div className="p-4 text-zinc-500 text-sm text-center">
                      No files yet. Start by describing your app in the chat.
                    </div>
                  ) : (
                    <div className="p-2">
                      {files.map((file) => (
                        <button
                          key={file.file_id}
                          onClick={() => {
                            setSelectedFile(file);
                            setShowDiff(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm font-code truncate transition-colors ${
                            selectedFile?.file_id === file.file_id
                              ? 'bg-violet-600/20 text-violet-400 border border-violet-600/30'
                              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                          data-testid={`file-${file.file_id}`}
                        >
                          {file.path}
                          {file.previous_content && (
                            <span className="ml-2 text-xs text-yellow-500">●</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-auto">
                  {selectedFile ? (
                    showDiff && selectedFile.previous_content ? (
                      <div className="h-full overflow-auto bg-zinc-950">
                        <ReactDiffViewer
                          oldValue={selectedFile.previous_content}
                          newValue={selectedFile.content}
                          splitView={true}
                          useDarkTheme={true}
                          leftTitle="Previous"
                          rightTitle="Current"
                          styles={{
                            variables: {
                              dark: {
                                diffViewerBackground: '#09090b',
                                diffViewerColor: '#fafafa',
                                addedBackground: '#064e3b',
                                addedColor: '#a7f3d0',
                                removedBackground: '#7f1d1d',
                                removedColor: '#fca5a5',
                                wordAddedBackground: '#065f46',
                                wordRemovedBackground: '#991b1b',
                                addedGutterBackground: '#064e3b',
                                removedGutterBackground: '#7f1d1d',
                                gutterBackground: '#18181b',
                                gutterBackgroundDark: '#09090b',
                                highlightBackground: '#27272a',
                                highlightGutterBackground: '#27272a',
                              },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <SyntaxHighlighter
                        language={selectedFile.language || 'javascript'}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '1.5rem',
                          background: '#09090b',
                          fontSize: '0.875rem',
                        }}
                        showLineNumbers
                        data-testid="code-viewer"
                      >
                        {selectedFile.content}
                      </SyntaxHighlighter>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                      Select a file to view
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 m-0 bg-white" data-testid="preview-pane">
                {files.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 bg-black">
                    <div className="text-center p-8">
                      <Play className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                      <p className="text-lg mb-2">No Code Yet</p>
                      <p className="text-sm text-zinc-600">Generate code to see the live preview</p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    key={previewKey}
                    title="Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                    style={{ background: 'white' }}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-zinc-950">
            <div className="p-4 border-b border-zinc-800 flex-shrink-0">
              <h2 className="font-heading font-semibold text-lg">AI Chat</h2>
              <p className="text-xs text-zinc-500 mt-1">Describe changes or new features</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-500 text-center">
                  <div className="animate-fade-in">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white mb-3">
                      AI App Builder
                    </h3>
                    <p className="text-lg mb-2">Describe what you want to build</p>
                    <p className="text-sm text-zinc-600 max-w-md mx-auto">
                      Tell me about your app idea and I'll generate production-ready React code with Tailwind CSS
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={() => setPrompt("Build a todo app with add, edit, delete functionality")}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs transition-all hover:scale-105"
                      >
                        Todo App
                      </button>
                      <button
                        onClick={() => setPrompt("Create a habit tracker with daily streaks and dark mode")}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs transition-all hover:scale-105"
                      >
                        Habit Tracker
                      </button>
                      <button
                        onClick={() => setPrompt("Build a weather dashboard with real-time data")}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs transition-all hover:scale-105"
                      >
                        Weather App
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    let displayContent = msg.content;
                    let explanation = null;
                    let changesSummary = null;
                    
                    if (msg.role === 'assistant') {
                      try {
                        const cleaned = msg.content.replace(/```json\\n?|```/g, '').trim();
                        const parsed = JSON.parse(cleaned);
                        explanation = parsed.explanation;
                        changesSummary = parsed.changes_summary;
                      } catch {
                        displayContent = msg.content;
                      }
                    }
                    
                    return (
                      <div
                        key={msg.message_id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                      >
                        {msg.role === 'user' ? (
                          <div className="chat-bubble chat-bubble-user shadow-md max-w-[80%]" data-testid={`message-${msg.message_id}`}>
                            <p className="text-sm font-medium">{msg.content}</p>
                          </div>
                        ) : (
                          <div className="chat-bubble chat-bubble-assistant max-w-[85%]" data-testid={`message-${msg.message_id}`}>
                            {explanation ? (
                              <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                  <Sparkles className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-white mb-1">Generated Code</p>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{explanation}</p>
                                  </div>
                                </div>
                                {changesSummary && (
                                  <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-700">
                                    <p className="text-xs font-semibold text-zinc-400 mb-1">Changes:</p>
                                    <p className="text-xs text-zinc-500">{changesSummary}</p>
                                  </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => setActiveTab('code')}
                                    className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                                  >
                                    View Code →
                                  </button>
                                  <button
                                    onClick={() => setActiveTab('preview')}
                                    className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                                  >
                                    View Preview →
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{displayContent}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {generating && (
                <div className="flex justify-start animate-scale-in">
                  <div className="chat-bubble chat-bubble-assistant">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-zinc-400">Generating your app...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleGenerate} className="p-4 border-t border-zinc-800 flex-shrink-0">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a login page with email/password..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate(e);
                    }
                  }}
                  disabled={generating}
                  className="bg-zinc-900/80 backdrop-blur-sm border-zinc-700 focus:border-violet-500/50 rounded-xl resize-none min-h-[60px]"
                  data-testid="prompt-input"
                />
                <Button
                  type="submit"
                  disabled={!prompt.trim() || generating}
                  className="bg-violet-600 hover:bg-violet-700 px-4 h-auto active:scale-95"
                  data-testid="send-btn"
                >
                  {generating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Builder;
