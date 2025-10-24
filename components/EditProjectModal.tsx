

import React, { useState } from 'react';
import type { Project } from '../types';
import { updateProject } from '../services/supabaseService';
import { ProjectForm } from './ProjectForm';

interface EditProjectModalProps {
  project: Project;
  supabaseConfig: { url: string; key: string };
  onClose: () => void;
  onProjectUpdated: () => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, supabaseConfig, onClose, onProjectUpdated }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateProject(supabaseConfig.url, supabaseConfig.key, project.id, projectData);
      onProjectUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl text-left flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-2xl font-bold text-green-400">Edit Project</h3>
          <p className="text-gray-400">Update the configuration for this project.</p>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
          <ProjectForm
            isSaving={isSaving}
            onSave={handleSaveProject}
            initialData={project}
          />
        </div>
        <div className="p-4 bg-gray-900/50 rounded-b-xl flex justify-end space-x-2 border-t border-gray-700">
          <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="project-form" disabled={isSaving} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:text-gray-400">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};