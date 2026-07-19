import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PCloudFile {
  id: string;
  name: string;
  size: number;
  isfolder: boolean;
  fileid?: number;
  parentfolderid?: number;
  created?: string;
  modified?: string;
  contents?: PCloudFile[];
}

export interface CategorizedFiles {
  images: PCloudFile[];
  videos: PCloudFile[];
  others: PCloudFile[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class PCloudAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/routes/pcloud.php`;
  }

  // List all files categorized
  async listFiles(folderId?: number): Promise<CategorizedFiles> {
    try {
      const params = folderId ? { folderid: folderId } : {};
      const response = await axios.get<ApiResponse<CategorizedFiles>>(this.baseUrl, {
        params: { ...params, endpoint: 'list' }
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to list files');
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Upload file
  async uploadFile(file: File, folderId?: number): Promise<PCloudFile> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folderid', folderId.toString());
      }

      const response = await axios.post<ApiResponse<PCloudFile>>(
        `${this.baseUrl}?endpoint=upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log(`Upload progress: ${progress}%`);
            }
          }
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to upload file');
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Create folder
  async createFolder(name: string, parentFolderId?: number): Promise<PCloudFile> {
    try {
      const response = await axios.post<ApiResponse<PCloudFile>>(
        `${this.baseUrl}?endpoint=create-folder`,
        {
          name,
          parentFolderId: parentFolderId || 0
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to create folder');
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(fileId: number): Promise<void> {
    try {
      const response = await axios.delete<ApiResponse>(
        `${this.baseUrl}?endpoint=delete`,
        {
          data: { fileId }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get download URL
  getDownloadUrl(fileId: number, fileName?: string): string {
    const params = new URLSearchParams({
      endpoint: 'download',
      fileid: fileId.toString()
    });
    
    if (fileName) {
      params.append('name', fileName);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  // Get thumbnail URL
  getThumbnailUrl(fileId: number, size: string = '256x256'): string {
    return `${this.baseUrl}?endpoint=thumbnail&fileid=${fileId}&size=${size}`;
  }

  // Get video streaming URL
  getVideoUrl(fileId: number): string {
    return `${this.baseUrl}?endpoint=video&fileid=${fileId}`;
  }

  // Search files
  async searchFiles(query: string, folderId?: number): Promise<CategorizedFiles> {
    try {
      const allFiles = await this.listFiles(folderId);
      const searchQuery = query.toLowerCase();

      const filterArray = (files: PCloudFile[]) =>
        files.filter(file => file.name.toLowerCase().includes(searchQuery));

      return {
        images: filterArray(allFiles.images),
        videos: filterArray(allFiles.videos),
        others: filterArray(allFiles.others)
      };
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(filename: string): { icon: string; color: string } {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const iconMap: Record<string, { icon: string; color: string }> = {
      // Documents
      'pdf': { icon: 'file-pdf', color: '#e74c3c' },
      'doc': { icon: 'file-word', color: '#2b579a' },
      'docx': { icon: 'file-word', color: '#2b579a' },
      'xls': { icon: 'file-excel', color: '#1d6f42' },
      'xlsx': { icon: 'file-excel', color: '#1d6f42' },
      'ppt': { icon: 'file-powerpoint', color: '#d24726' },
      'pptx': { icon: 'file-powerpoint', color: '#d24726' },
      'txt': { icon: 'file-alt', color: '#7f8c8d' },
      'rtf': { icon: 'file-alt', color: '#7f8c8d' },
      
      // Archives
      'zip': { icon: 'file-archive', color: '#f39c12' },
      'rar': { icon: 'file-archive', color: '#f39c12' },
      '7z': { icon: 'file-archive', color: '#f39c12' },
      'tar': { icon: 'file-archive', color: '#f39c12' },
      'gz': { icon: 'file-archive', color: '#f39c12' },
      
      // Code
      'js': { icon: 'file-code', color: '#f1c40f' },
      'html': { icon: 'file-code', color: '#e67e22' },
      'css': { icon: 'file-code', color: '#3498db' },
      'php': { icon: 'file-code', color: '#6c5ce7' },
      'json': { icon: 'file-code', color: '#2ecc71' },
      'xml': { icon: 'file-code', color: '#e74c3c' },
      
      // Audio
      'mp3': { icon: 'file-audio', color: '#9b59b6' },
      'wav': { icon: 'file-audio', color: '#8e44ad' },
      'ogg': { icon: 'file-audio', color: '#9b59b6' },
      
      // Default
      'default': { icon: 'file', color: '#7f8c8d' }
    };
    
    return iconMap[ext] || iconMap['default'];
  }

  // Check if file is image
  isImage(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  }

  // Check if file is video
  isVideo(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', 'm4v'].includes(ext);
  }
}

export default new PCloudAPI();
