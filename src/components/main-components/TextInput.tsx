'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Github, X, Upload, Link, Folder, FileText, Star, GitBranch } from 'lucide-react';

interface GitHubFile {
  name: string;
  path: string;
  content: string;
  size: number;
  type: 'file' | 'dir';
  language?: string;
}

interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  files: GitHubFile[];
}

interface TextInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  title?: string;
  onSubmit?: (data: {
    text: string;
    files?: File[];
    githubRepo?: string;
  }) => void;
}

export function TextInput({ placeholder = "Enter your message...", value, onChange, className, title = "Work Input", onSubmit }: TextInputProps) {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [githubRepo, setGithubRepo] = useState('');
  const [githubRepoData, setGithubRepoData] = useState<GitHubRepo | null>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const detectLanguageFromFile = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'dart': 'dart',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    return languageMap[extension || ''] || 'javascript';
  };

  const fetchGitHubRepo = async (repoUrl: string): Promise<GitHubRepo | null> => {
    try {
      // Extract owner and repo from GitHub URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error('Invalid GitHub URL');
      
      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');
      
      // Fetch repository info
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`);
      if (!repoResponse.ok) throw new Error('Repository not found');
      const repoData = await repoResponse.json();
      
      // Fetch repository contents
      // In the fetchGitHubRepo function, replace the any types:
      const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents`);
      if (!contentsResponse.ok) throw new Error('Failed to fetch contents');
      const contents: Array<{
        name: string;
        path: string;
        type: string;
        size: number;
        download_url: string;
      }> = await contentsResponse.json();
      
      // Process files (limit to first 10 files for performance)
      const files: GitHubFile[] = [];
      const filePromises = contents
        .filter((item: {
          name: string;
          path: string;
          type: string;
          size: number;
          download_url: string;
        }) => item.type === 'file')
        .slice(0, 10)
        .map(async (item: {
          name: string;
          path: string;
          type: string;
          size: number;
          download_url: string;
        }) => {
          try {
            const fileResponse = await fetch(item.download_url);
            const content = await fileResponse.text();
            return {
              name: item.name,
              path: item.path,
              content: content,
              size: item.size,
              type: 'file' as const,
              language: detectLanguageFromFile(item.name)
            };
          } catch {
            return null;
          }
        });
      
      const resolvedFiles = await Promise.all(filePromises);
      files.push(...resolvedFiles.filter(Boolean) as GitHubFile[]);
      
      return {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description || 'No description available',
        stars: repoData.stargazers_count,
        language: repoData.language || 'Unknown',
        files
      };
    } catch (error) {
      console.error('Error fetching GitHub repo:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    const currentValue = value !== undefined ? value : internalValue;
    if (currentValue.trim() || attachedFiles.length > 0 || githubRepoData) {
      setIsSubmitting(true);
      
      try {
        let codeContent = currentValue;
        let language = 'javascript';
        
        // If GitHub repo is attached, use the first file's content
        if (githubRepoData && githubRepoData.files.length > 0) {
          const firstFile = githubRepoData.files[0];
          language = firstFile.language || 'javascript';
          
          // Combine user input with GitHub repo content
          if (currentValue.trim()) {
            codeContent = `// User Input: ${currentValue}\n\n// GitHub Repository: ${githubRepoData.fullName}\n// File: ${firstFile.name}\n${firstFile.content}`;
          } else {
            codeContent = firstFile.content;
          }
        }
        // If files are attached, read the first file's content and use it as code
        else if (attachedFiles.length > 0) {
          const firstFile = attachedFiles[0];
          try {
            const fileContent = await readFileContent(firstFile);
            language = detectLanguageFromFile(firstFile.name);
            
            // Combine user input with file content
            if (currentValue.trim()) {
              codeContent = `// User Input: ${currentValue}\n\n// File: ${firstFile.name}\n${fileContent}`;
            } else {
              codeContent = fileContent;
            }
          } catch (error) {
            console.error('Error reading file:', error);
            // Fallback to user input if file reading fails
            codeContent = currentValue;
          }
        }
        
        // Save to database
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: codeContent,
            language: language,
            initialMessage: currentValue || (githubRepoData ? `Opened GitHub repository: ${githubRepoData.fullName}` : `Opened file: ${attachedFiles[0]?.name || 'Unknown'}`),
            githubRepo: githubRepoData ? {
              name: githubRepoData.name,
              fullName: githubRepoData.fullName,
              files: githubRepoData.files
            } : undefined
          }),
        });
        
        if (response.ok) {
          const { session } = await response.json();
          
          // Navigate to editor page with session ID
          router.push(`/editor/${session.id}`);
          
          // Also call the original onSubmit if provided
          onSubmit?.({
            text: currentValue,
            files: attachedFiles.length > 0 ? attachedFiles : undefined,
            githubRepo: githubRepoData?.fullName
          });
          
          // Reset after submit
          setAttachedFiles([]);
          setGithubRepo('');
          setGithubRepoData(null);
          setShowGithubModal(false);
          setInternalValue('');
        } else {
          console.error('Failed to save session');
        }
      } catch (error) {
        console.error('Error saving session:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setAttachedFiles(prev => [...prev, ...fileArray]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGithubRepoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGithubRepo(e.target.value);
  };

  const handleGithubModalSubmit = async () => {
    if (githubRepo.trim()) {
      setIsLoadingRepo(true);
      const repoData = await fetchGitHubRepo(githubRepo.trim());
      if (repoData) {
        setGithubRepoData(repoData);
      }
      setIsLoadingRepo(false);
    }
    setShowGithubModal(false);
  };

  const removeGithubRepo = () => {
    setGithubRepoData(null);
    setGithubRepo('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'scss', 'json', 'xml'];
    return codeExtensions.includes(extension || '') ? '📄' : '📎';
  };

  return (
    <div className={cn("w-full max-w-4xl", className)}>
      {/* Large title text above textarea */}
      <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 text-center">
        {title}
      </h2>
      
      <motion.div
        className="relative w-full"
        whileFocus={{ scale: 1.02 }}
      >
        <div 
          className={cn(
            "relative transition-all duration-300",
            isDragOver && "ring-2 ring-blue-400/50 ring-offset-2 ring-offset-transparent"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            value={value !== undefined ? value : internalValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={
              githubRepoData 
                ? `GitHub repository attached: ${githubRepoData.name}. Add description or press Enter to open in editor...`
                : attachedFiles.length > 0 
                  ? `File attached: ${attachedFiles[0].name}. Add description or press Enter to open in editor...` 
                  : placeholder
            }
            rows={6}
            disabled={isSubmitting}
            className={cn(
              "w-full p-4 pr-16 pb-16 rounded-xl resize-none transition-all duration-300",
              "bg-black/20 backdrop-blur-sm border border-white/10",
              "text-white placeholder:text-gray-400 text-lg",
              "focus:outline-none focus:border-white/30 focus:bg-black/30",
              "hover:border-white/20 hover:bg-black/25",
              "scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{
              background: isFocused 
                ? `radial-gradient(ellipse at center, rgba(38, 38, 38, 0.4) 0%, rgba(0, 0, 0, 0.3) 100%)`
                : `radial-gradient(ellipse at center, rgba(38, 38, 38, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%)`,
              boxShadow: isFocused 
                ? '0 0 20px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 0 10px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}
          />
          
          {/* Drag overlay */}
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm rounded-xl border-2 border-dashed border-blue-400/50 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center text-white">
                  <Upload size={32} className="mx-auto mb-2 text-blue-400" />
                  <p className="text-lg font-medium">Drop files here</p>
                  <p className="text-sm text-gray-300 mt-1">Files will open in the code editor</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Attachment Options */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {/* File Upload Button */}
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "group relative p-2.5 rounded-lg overflow-hidden",
                "bg-gradient-to-r from-blue-500/20 to-purple-500/20",
                "border border-white/20 backdrop-blur-sm",
                "text-white hover:from-blue-500/30 hover:to-purple-500/30",
                "hover:border-white/30 transition-all duration-300",
                attachedFiles.length > 0 && "from-blue-500/30 to-purple-500/30 border-white/30"
              )}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              title={attachedFiles.length > 0 ? `${attachedFiles.length} file(s) attached - will open in editor` : "Upload files to open in editor"}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Paperclip size={16} className="relative z-10 transition-transform duration-200 group-hover:rotate-12" />
              {attachedFiles.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{attachedFiles.length}</span>
                </div>
              )}
            </motion.button>
            
            {/* GitHub Repo Button */}
            <motion.button
              onClick={() => setShowGithubModal(true)}
              className={cn(
                "group relative p-2.5 rounded-lg overflow-hidden",
                "bg-gradient-to-r from-gray-500/20 to-slate-500/20",
                "border border-white/20 backdrop-blur-sm",
                "text-white hover:from-gray-500/30 hover:to-slate-500/30",
                "hover:border-white/30 transition-all duration-300",
                githubRepoData && "from-gray-500/30 to-slate-500/30 border-white/30"
              )}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              title="Attach GitHub repository"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/10 to-slate-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Github size={16} className="relative z-10 transition-transform duration-200 group-hover:scale-110" />
              {githubRepoData && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">✓</span>
                </div>
              )}
            </motion.button>
          </div>
          
          {/* Submit Button */}
          <motion.button
            onClick={handleSubmit}
            className={cn(
              "group absolute bottom-3 right-3 p-3 rounded-lg overflow-hidden",
              "bg-gradient-to-r from-emerald-500/20 to-teal-500/20",
              "border border-white/20 backdrop-blur-sm",
              "text-white hover:from-emerald-500/30 hover:to-teal-500/30",
              "hover:border-white/30 transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
            disabled={!(value !== undefined ? value : internalValue).trim() && attachedFiles.length === 0 && !githubRepoData || isSubmitting}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            title={githubRepoData ? "Open repository in editor" : attachedFiles.length > 0 ? "Open file in editor" : "Send to editor"}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send 
                size={20} 
                className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" 
              />
            )}
          </motion.button>
          
          {/* Animated border effect */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
              opacity: isFocused ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          />
        </div>
        
        {/* GitHub Repository Display */}
        <AnimatePresence>
          {githubRepoData && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Github size={14} />
                  GitHub Repository
                </h4>
                <motion.button
                  onClick={removeGithubRepo}
                  className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={14} />
                </motion.button>
              </div>
              
              {/* Repository Info */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-lg bg-gradient-to-r from-slate-800/40 to-gray-800/40 backdrop-blur-sm border border-white/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="text-white font-semibold text-lg flex items-center gap-2">
                      <Folder size={18} className="text-blue-400" />
                      {githubRepoData.name}
                    </h5>
                    <p className="text-gray-400 text-sm mt-1">{githubRepoData.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Star size={12} />
                      {githubRepoData.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch size={12} />
                      {githubRepoData.language}
                    </span>
                  </div>
                </div>
                
                {/* Repository Files */}
                {githubRepoData.files.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="text-xs font-medium text-gray-300 flex items-center gap-1">
                      <FileText size={12} />
                      Files ({githubRepoData.files.length})
                    </h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                      {githubRepoData.files.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md",
                            "bg-black/20 border border-white/5 hover:border-white/10",
                            "transition-all duration-200",
                            index === 0 && "ring-1 ring-blue-400/30"
                          )}
                        >
                          <FileText size={14} className="text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">
                              {file.name}
                              {index === 0 && <span className="text-blue-400 ml-1">(Primary)</span>}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {formatFileSize(file.size)} • {file.language}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {githubRepoData.files.length > 1 && (
                      <p className="text-xs text-blue-400 mt-2">
                        💡 The first file will be opened in the editor. Other files will be available in the chat.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Attached Files Display */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 space-y-2"
            >
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Upload size={14} />
                Files to Open in Editor ({attachedFiles.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachedFiles.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-lg",
                      "bg-gradient-to-r from-slate-800/40 to-gray-800/40 backdrop-blur-sm",
                      "border border-white/10 hover:border-white/20",
                      "transition-all duration-200 hover:from-slate-800/60 hover:to-gray-800/60",
                      index === 0 && "ring-1 ring-blue-400/30"
                    )}
                  >
                    <div className="text-lg">{getFileIcon(file.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {file.name}
                        {index === 0 && <span className="text-blue-400 text-xs ml-2">(Primary)</span>}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {formatFileSize(file.size)} • {detectLanguageFromFile(file.name)}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => removeFile(index)}
                      className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={14} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
              {attachedFiles.length > 1 && (
                <p className="text-xs text-blue-400 mt-2">
                  💡 The first file will be opened in the editor. Other files will be available in the chat.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Helper text */}
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <span>
            {githubRepoData
              ? "GitHub repository ready to open in editor"
              : attachedFiles.length > 0 
                ? "Files ready to open in editor" 
                : "Drag & drop files or click to upload"}
          </span>
          <span>Press Enter to send • Shift+Enter for new line</span>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          accept="*/*"
        />
      </motion.div>

      {/* GitHub Modal */}
      <AnimatePresence>
        {showGithubModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowGithubModal(false)}
          >
            {/* Backdrop with blur */}
            <motion.div
              initial={{ backdropFilter: 'blur(0px)' }}
              animate={{ backdropFilter: 'blur(12px)' }}
              exit={{ backdropFilter: 'blur(0px)' }}
              className="absolute inset-0 bg-black/60"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500/20 to-slate-500/20">
                        <Github size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">GitHub Repository</h3>
                        <p className="text-sm text-gray-400">Enter repository URL to fetch files</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setShowGithubModal(false)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <Link size={18} />
                      </div>
                      <input
                        type="text"
                        value={githubRepo}
                        onChange={handleGithubRepoChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleGithubModalSubmit();
                          }
                        }}
                        placeholder="https://github.com/username/repository"
                        className="w-full pl-12 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40 focus:bg-black/40 transition-all duration-200"
                        disabled={isLoadingRepo}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>• Repository files will be fetched and displayed</p>
                      <p>• First 10 files will be available in the editor</p>
                      <p>• Public repositories only</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <motion.button
                      onClick={() => setShowGithubModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:border-white/30 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleGithubModalSubmit}
                      disabled={!githubRepo.trim() || isLoadingRepo}
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoadingRepo ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Fetching...
                        </div>
                      ) : (
                        'Fetch Repository'
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}