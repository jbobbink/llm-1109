

import React, { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types';
import { getProjects, deleteProject } from '../services/supabaseService';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';

interface ProjectsListProps {
  supabaseConfig: { url: string; key: string };
  onViewProject: (project: Project) => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({ supabaseConfig, onViewProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProjects = await getProjects(supabaseConfig.url, supabaseConfig.key);
      setProjects(fetchedProjects);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseConfig]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectCreated = () => {
    setIsCreateModalOpen(false);
    fetchProjects();
  };
  
  const handleProjectUpdated = () => {
      setEditingProject(null);
      fetchProjects();
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This will delete all associated run data.`)) {
      try {
        await deleteProject(supabaseConfig.url, supabaseConfig.key, projectId);
        fetchProjects();
      } catch (e) {
        alert(`Failed to delete project: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
  };

  if (isLoading) {
    return <p className="text-gray-400 text-center">Loading projects...</p>;
  }

  if (error) {
    return <p className="text-red-400 text-center">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-200">Projects</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Create New Project
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg text-gray-200">{project.name}</h3>
                <p className="text-sm text-gray-400">{project.description}</p>
                 <p className="text-xs text-gray-500 mt-1">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => onViewProject(project)}
                  className="bg-green-500 hover:bg-green-600 text-gray-900 font-semibold py-2 px-3 rounded-md transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setEditingProject(project)}
                  className="bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold py-2 px-3 rounded-md transition-colors"
                >
                  Edit
                </button>
                 <button
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  className="bg-red-900/50 hover:bg-red-900/80 text-red-300 font-semibold py-2 px-3 rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-gray-200">No Projects Found</h3>
          <p className="text-gray-500 mt-1">Click "Create New Project" to get started.</p>
        </div>
      )}
      
      {isCreateModalOpen && (
        <CreateProjectModal 
            supabaseConfig={supabaseConfig}
            onClose={() => setIsCreateModalOpen(false)}
            onProjectCreated={handleProjectCreated}
        />
      )}
      {editingProject && (
        <EditProjectModal
            project={editingProject}
            supabaseConfig={supabaseConfig}
            onClose={() => setEditingProject(null)}
            onProjectUpdated={handleProjectUpdated}
        />
      )}
    </div>
  );
};