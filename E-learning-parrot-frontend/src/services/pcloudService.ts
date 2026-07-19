import axios from 'axios';

// pCloud API Configuration
const PCLOUD_CONFIG = {
  accessToken: import.meta.env.VITE_PCLOUD_ACCESS_TOKEN || '',
  baseUrl: import.meta.env.VITE_PCLOUD_BASE_URL || 'https://api.pcloud.com',
  folderId: 0 // Root folder, change to specific course folder
};

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

export interface PCloudResponse<T = any> {
  result: number;
  metadata?: T;
  error?: string;
}

export interface CategorizedFiles {
  images: PCloudFile[];
  videos: PCloudFile[];
  others: PCloudFile[];
}

class PCloudService {
  private accessToken: string;

  constructor() {
    this.accessToken = PCLOUD_CONFIG.accessToken;
  }

  // List all files recursively
  async listFiles(folderId: number = PCLOUD_CONFIG.folderId): Promise<PCloudFile[]> {
    try {
      const response = await axios.get(
        `${PCLOUD_CONFIG.baseUrl}/listfolder`,
        {
          params: {
            folderid: folderId,
            recursive: 1,
            access_token: this.accessToken
          }
        }
      );

      if (response.data.result !== 0) {
        throw new Error(response.data.error || 'Failed to list files');
      }

      const files: PCloudFile[] = [];
      this.flattenFiles(response.data.metadata.contents, files);
      return files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Get categorized files (images, videos, others)
  async getCategorizedFiles(folderId?: number): Promise<CategorizedFiles> {
    const files = await this.listFiles(folderId);
    
    const categorized: CategorizedFiles = {
      images: [],
      videos: [],
      others: []
    };

    files.forEach(file => {
      if (file.isfolder) return;

      const ext = this.getFileExtension(file.name);
      
      if (this.isImage(ext)) {
        categorized.images.push(file);
      } else if (this.isVideo(ext)) {
        categorized.videos.push(file);
      } else {
        categorized.others.push(file);
      }
    });

    return categorized;
  }

  // Upload file to pCloud
  async uploadFile(file: File, folderId: number = PCLOUD_CONFIG.folderId): Promise<PCloudFile> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderid', folderId.toString());
      formData.append('access_token', this.accessToken);

      const response = await axios.post(
        `${PCLOUD_CONFIG.baseUrl}/uploadfile`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.result !== 0) {
        throw new Error(response.data.error || 'Failed to upload file');
      }

      return response.data.metadata;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Create folder
  async createFolder(name: string, parentFolderId: number = PCLOUD_CONFIG.folderId): Promise<PCloudFile> {
    try {
      const response = await axios.get(
        `${PCLOUD_CONFIG.baseUrl}/createfolder`,
        {
          params: {
            name,
            folderid: parentFolderId,
            access_token: this.accessToken
          }
        }
      );

      if (response.data.result !== 0) {
        throw new Error(response.data.error || 'Failed to create folder');
      }

      return response.data.metadata;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Delete file or folder
  async deleteFile(fileId: number): Promise<void> {
    try {
      const response = await axios.get(
        `${PCLOUD_CONFIG.baseUrl}/deletefile`,
        {
          params: {
            fileid: fileId,
            access_token: this.accessToken
          }
        }
      );

      if (response.data.result !== 0) {
        throw new Error(response.data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get file download link
  getDownloadLink(fileId: number, fileName: string): string {
    return `${PCLOUD_CONFIG.baseUrl}/getfilelink?fileid=${fileId}&access_token=${this.accessToken}`;
  }

  // Get thumbnail URL for images
  getThumbnailUrl(fileId: number, size: string = '256x256'): string {
    return `${PCLOUD_CONFIG.baseUrl}/getthumb?fileid=${fileId}&access_token=${this.accessToken}&size=${size}&type=auto`;
  }

  // Get video streaming URL
  getVideoUrl(fileId: number): string {
    return `${PCLOUD_CONFIG.baseUrl}/getvideolink?fileid=${fileId}&access_token=${this.accessToken}&stream=1`;
  }

  // Search files by name
  async searchFiles(query: string, folderId?: number): Promise<PCloudFile[]> {
    const allFiles = await this.listFiles(folderId);
    return allFiles.filter(file => 
      file.name.toLowerCase().includes(query.toLowerCase()) && !file.isfolder
    );
  }

  // Helper methods
  private flattenFiles(items: PCloudFile[], output: PCloudFile[]): void {
    items.forEach(item => {
      if (!item.isfolder) {
        output.push(item);
      } else if (item.contents) {
        this.flattenFiles(item.contents, output);
      }
    });
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private isImage(ext: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  }

  private isVideo(ext: string): boolean {
    return ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', 'm4v'].includes(ext);
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on extension
  getFileIcon(filename: string): { icon: string; color: string } {
    const ext = this.getFileExtension(filename);
    
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
}

export default new PCloudService();
