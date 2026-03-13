import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templateService, projectService } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Sparkles, ArrowLeft, Rocket } from 'lucide-react';

const TemplatesPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template) => {
    try {
      const project = await projectService.createProject({
        name: template.name,
        description: template.description,
        llm_provider: 'openai',
        llm_model: 'gpt-5.2',
      });

      await projectService.generateCode(project.project_id, template.initial_prompt);
      
      toast.success('Template applied!');
      navigate(`/builder/${project.project_id}`);
    } catch (error) {
      console.error('Template use error:', error);
      toast.error('Failed to use template');
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
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-600" />
              <span className="text-xl font-heading font-bold">Templates</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-3">
            Start with a Template
          </h1>
          <p className="text-zinc-400 text-lg">Choose a template and customize it to your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.template_id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-600 hover:bg-zinc-900/80 transition-all group"
              data-testid={`template-${template.template_id}`}
            >
              <div className="w-12 h-12 bg-violet-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-violet-600/20 transition-colors">
                <Rocket className="w-6 h-6 text-violet-600" />
              </div>
              
              <h3 className="text-xl font-heading font-medium mb-2">{template.name}</h3>
              <p className="text-zinc-500 text-sm mb-4">{template.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <Button
                onClick={() => handleUseTemplate(template)}
                className="w-full bg-violet-600 hover:bg-violet-700 active:scale-95"
                data-testid={`use-template-${template.template_id}`}
              >
                Use Template
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default TemplatesPage;
