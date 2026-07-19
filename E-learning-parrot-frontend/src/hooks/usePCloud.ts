import { useState, useEffect } from 'react';
import pcloudService, { PCloudFile, CategorizedFiles } from '@/services/pcloudService';

export interface UsePCloudReturn {
  files: CategorizedFiles;
  loading: boolean;
  error: string | null;
  refreshFiles: () => Promise<void>;
  uploadFile: (file: File, folderId?: number) => Promise<PCloudFile>;
  deleteFile: (fileId: number) => Promise<void>;
  searchFiles: (query: string) => CategorizedFiles;
}

export const usePCloud = (folderId?: number): UsePCloudReturn => {
  const [files, setFiles] = useState<CategorizedFiles>({
    images: [],
    videos: [],
    others: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const categorizedFiles = await pcloudService.getCategorizedFiles(folderId);
      setFiles(categorizedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const refreshFiles = async () => {
    await loadFiles();
  };

  const uploadFile = async (file: File, targetFolderId?: number): Promise<PCloudFile> => {
    try {
      const uploadedFile = await pcloudService.uploadFile(file, targetFolderId || folderId);
      await loadFiles(); // Refresh files after upload
      return uploadedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteFile = async (fileId: number): Promise<void> => {
    try {
      await pcloudService.deleteFile(fileId);
      await loadFiles(); // Refresh files after deletion
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const searchFiles = (query: string): CategorizedFiles => {
    if (!query.trim()) return files;

    const searchQuery = query.toLowerCase();
    const filterArray = (fileArray: PCloudFile[]) =>
      fileArray.filter(file => file.name.toLowerCase().includes(searchQuery));

    return {
      images: filterArray(files.images),
      videos: filterArray(files.videos),
      others: filterArray(files.others)
    };
  };

  useEffect(() => {
    loadFiles();
  }, [folderId]);

  return {
    files,
    loading,
    error,
    refreshFiles,
    uploadFile,
    deleteFile,
    searchFiles
  };
};
