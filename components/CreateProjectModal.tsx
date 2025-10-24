

import React, { useState } from 'react';
import type { Project } from '../types';
// FIX: Corrected import path for supabaseService.
import { createProject } from '../services/supabaseService';
// FIX: Corrected import path for ProjectForm.
import { ProjectForm } from './ProjectForm';

interface CreateProjectModalProps {
  supabaseConfig: { url: string; key: string };
  onClose: () => void;
  onProjectCreated: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ supabaseConfig, onClose, onProjectCreated }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    setIsSaving(true);
    setError(null);
    try {
      await createProject(supabaseConfig.url, supabaseConfig.key, projectData);
      onProjectCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl text-left flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-2xl font-bold text-green-400">Create New Project</h3>
          <p className="text-gray-400">Define the configuration for this project. It can be run repeatedly to track changes over time.</p>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
          <ProjectForm
            isSaving={isSaving}
            onSave={handleSaveProject}
          />
        </div>
        <div className="p-4 bg-gray-900/50 rounded-b-xl flex justify-end space-x-2 border-t border-gray-700">
          <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="project-form" disabled={isSaving} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:text-gray-400">
            {isSaving ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  );
};