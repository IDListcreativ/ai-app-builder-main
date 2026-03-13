import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sparkles, Eye, Code2, Info, ExternalLink, Copy, Share2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SharePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    loadSharedProject();
  }, [slug]);

  const loadSharedProject = async () => {
    try {
      const response = await axios.get(`${API_URL}/share/${slug}`);
      setProject(response.data);
      
      if (response.data.files && response.data.files.length > 0) {
        setSelectedFile(response.data.files[0]);
      }
      
      if (!response.data.deployment_url) {
        setActiveTab('code');
      }
    } catch (error) {
      console.error('Failed to load shared project:', error);
      toast.error('Project not found or no longer shared');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleShareTwitter = () => {
    const text = `Check out this app I built with MetaBuilder: ${project.name}`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold mb-4">Project Not Found</h1>
          <p className="text-zinc-400 mb-6">This project may have been unshared or doesn't exist.</p>
          <Button onClick={() => navigate('/')} className="bg-violet-600 hover:bg-violet-700">
            Go to MetaBuilder
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Sparkles className="w-6 h-6 text-violet-600" />
            <span className="text-xl font-heading font-bold">MetaBuilder</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleCopyLink}
              className="text-zinc-400 hover:text-white"
              data-testid="copy-link-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              onClick={() => navigate('/login')}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="build-yours-btn"
            >
              Build Yours
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold mb-3" data-testid="project-name">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-zinc-400 text-lg">{project.description}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleShareTwitter}
                className="bg-zinc-800 hover:bg-zinc-700"
                data-testid="share-twitter-btn"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                variant="secondary"
                onClick={handleShareLinkedIn}
                className="bg-zinc-800 hover:bg-zinc-700"
                data-testid="share-linkedin-btn"
              >
                <Share2 className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>Created by {project.creator_name}</span>
            <span>•</span>
            <span>Built with {project.llm_provider?.toUpperCase() || 'AI'}</span>
            {project.deployment_platform && (
              <>
                <span>•</span>
                <span>Deployed on {project.deployment_platform.charAt(0).toUpperCase() + project.deployment_platform.slice(1)}</span>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="preview" disabled={!project.deployment_url} data-testid="preview-tab">
              <Eye className="w-4 h-4 mr-2" />
              Live Preview
            </TabsTrigger>
            <TabsTrigger value="code" data-testid="code-tab">
              <Code2 className="w-4 h-4 mr-2" />
              Code
            </TabsTrigger>
            <TabsTrigger value="details" data-testid="details-tab">
              <Info className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-0">
            {project.deployment_url ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Live Preview</span>
                  <a
                    href={project.deployment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1"
                  >
                    Open in new tab
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <iframe
                  src={project.deployment_url}
                  className="w-full h-[600px] bg-white"
                  title="App Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h3 className="text-xl font-heading font-semibold mb-2">Not Deployed Yet</h3>
                <p className="text-zinc-400">This project hasn't been deployed to a live URL yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="code" className="space-y-0">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex">
              <div className="w-64 border-r border-zinc-800 overflow-y-auto max-h-[600px] bg-zinc-950">
                <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-400">Files ({project.files?.length || 0})</h3>
                </div>
                {project.files && project.files.length > 0 ? (
                  <div className="p-2">
                    {project.files.map((file, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm font-code truncate transition-colors ${
                          selectedFile?.path === file.path
                            ? 'bg-violet-600/20 text-violet-400 border border-violet-600/30'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        {file.path}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-zinc-500 text-sm">No files</div>
                )}
              </div>

              <div className="flex-1 overflow-auto max-h-[600px]">
                {selectedFile ? (
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
                  >
                    {selectedFile.content}
                  </SyntaxHighlighter>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    Select a file to view
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-xl font-heading font-semibold mb-4">Project Information</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-zinc-400 block mb-1">AI Provider</label>
                  <p className="text-white">{project.llm_provider?.toUpperCase() || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="text-sm text-zinc-400 block mb-1">Files Generated</label>
                  <p className="text-white">{project.files?.length || 0} files</p>
                </div>
                
                <div>
                  <label className="text-sm text-zinc-400 block mb-1">Last Updated</label>
                  <p className="text-white">
                    {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {project.prompts && project.prompts.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-xl font-heading font-semibold mb-4">Prompts Used</h3>
                <div className="space-y-2">
                  {project.prompts.slice(0, 5).map((prompt, index) => (
                    <div key={index} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <p className="text-sm text-zinc-300">{prompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 border border-violet-600/30 rounded-xl p-6 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-violet-400" />
              <h3 className="text-2xl font-heading font-semibold mb-2">Want to build your own?</h3>
              <p className="text-zinc-300 mb-4">Create amazing apps with AI in minutes</p>
              <Button
                onClick={() => navigate('/login')}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Get Started Free
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <footer className="mt-12 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
          <p>
            Created using <span className="text-violet-400 font-semibold">MetaBuilder</span> — 
            <a href="/" className="text-violet-400 hover:underline ml-1">Build your app in minutes</a>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default SharePage;
