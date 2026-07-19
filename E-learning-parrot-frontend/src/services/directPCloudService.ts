import axios from 'axios';

// Direct pCloud API Configuration
const PCLOUD_TOKEN = "kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX";
const PCLOUD_BASE_URL = "https://api.pcloud.com";

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

class DirectPCloudService {
  private token: string;
  private baseUrl: string;

  constructor() {
    this.token = PCLOUD_TOKEN;
    this.baseUrl = PCLOUD_BASE_URL;
  }

  // Direct API call to list folder
  async listFolder(folderId: number = 0): Promise<any> {
    const listUrl = `${this.baseUrl}/listfolder?folderid=${folderId}&recursive=1&access_token=${this.token}`;
    
    try {
      const response = await axios.get(listUrl);
      return response.data;
    } catch (error) {
      console.error('Error listing folder:', error);
      throw error;
    }
  }

  // Get categorized files
  async getCategorizedFiles(folderId: number = 0): Promise<CategorizedFiles> {
    try {
      const response = await this.listFolder(folderId);
      
      if (response.result !== 0) {
        throw new Error(response.error || 'Failed to list files');
      }

      const files: PCloudFile[] = [];
      this.flattenFiles(response.metadata.contents, files);

      const categorized: CategorizedFiles = {
        images: [],
        videos: [],
        others: []
      };

      files.forEach(file => {
        if (!file.isfolder) {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
            categorized.images.push(file);
          } else if (['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', 'm4v'].includes(ext)) {
            categorized.videos.push(file);
          } else {
            categorized.others.push(file);
          }
        }
      });

      return categorized;
    } catch (error) {
      console.error('Error getting categorized files:', error);
      throw error;
    }
  }

  // Upload file directly to pCloud
  async uploadFile(file: File, folderId: number = 0): Promise<PCloudFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderid', folderId.toString());
    formData.append('access_token', this.token);

    try {
      const response = await axios.post(`${this.baseUrl}/uploadfile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.result !== 0) {
        throw new Error(response.data.error || 'Upload failed');
      }

      return response.data.metadata;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // List folder contents by path - STATIC METHOD
  static async listFolderByPath(path: string = '/'): Promise<PCloudFile[]> {
    try {
      const response = await axios.get(`${PCLOUD_BASE_URL}/listfolder`, {
        params: {
          path: path,
          access_token: PCLOUD_TOKEN
        }
      });

      if (response.data.result === 0) {
        return response.data.metadata.contents || [];
      } else {
        throw new Error(response.data.error || 'Failed to list folder');
      }
    } catch (error) {
      console.error('Error listing folder by path:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(fileId: number): Promise<void> {
    try {
      const deleteUrl = `${this.baseUrl}/deletefile?fileid=${fileId}&access_token=${this.token}`;
      const response = await axios.get(deleteUrl);

      if (response.data.result !== 0) {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get file download link
  getDownloadLink(fileId: number): string {
    return `${this.baseUrl}/getfilelink?fileid=${fileId}&access_token=${this.token}`;
  }

  // Get thumbnail URL
  getThumbnailUrl(fileId: number, size: string = '256x256'): string {
    return `${this.baseUrl}/getthumb?fileid=${fileId}&access_token=${this.token}&size=${size}&type=auto`;
  }

  // Get video streaming link
  getVideoLink(fileId: number): string {
    return `${this.baseUrl}/getvideolink?fileid=${fileId}&access_token=${this.token}&stream=1`;
  }

  // Create folder
  async createFolder(name: string, parentFolderId: number = 0): Promise<PCloudFile> {
    try {
      const createUrl = `${this.baseUrl}/createfolder?name=${encodeURIComponent(name)}&folderid=${parentFolderId}&access_token=${this.token}`;
      const response = await axios.get(createUrl);

      if (response.data.result !== 0) {
        throw new Error(response.data.error || 'Create folder failed');
      }

      return response.data.metadata;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Helper function to flatten files recursively
  private flattenFiles(items: any[], output: PCloudFile[]): void {
    items.forEach(item => {
      if (!item.isfolder) {
        output.push({
          id: item.id.toString(),
          name: item.name,
          size: item.size || 0,
          isfolder: item.isfolder,
          fileid: item.fileid,
          parentfolderid: item.parentfolderid,
          created: item.created,
          modified: item.modified
        });
      } else if (item.contents) {
        this.flattenFiles(item.contents, output);
      }
    });
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon
  getFileIcon(filename: string): { icon: string; color: string } {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const iconMap: Record<string, { icon: string; color: string }> = {
      'pdf': { icon: 'file-pdf', color: '#e74c3c' },
      'doc': { icon: 'file-word', color: '#2b579a' },
      'docx': { icon: 'file-word', color: '#2b579a' },
      'xls': { icon: 'file-excel', color: '#1d6f42' },
      'xlsx': { icon: 'file-excel', color: '#1d6f42' },
      'ppt': { icon: 'file-powerpoint', color: '#d24726' },
      'pptx': { icon: 'file-powerpoint', color: '#d24726' },
      'txt': { icon: 'file-alt', color: '#7f8c8d' },
      'rtf': { icon: 'file-alt', color: '#7f8c8d' },
      'zip': { icon: 'file-archive', color: '#f39c12' },
      'rar': { icon: 'file-archive', color: '#f39c12' },
      '7z': { icon: 'file-archive', color: '#f39c12' },
      'tar': { icon: 'file-archive', color: '#f39c12' },
      'gz': { icon: 'file-archive', color: '#f39c12' },
      'js': { icon: 'file-code', color: '#f1c40f' },
      'html': { icon: 'file-code', color: '#e67e22' },
      'css': { icon: 'file-code', color: '#3498db' },
      'php': { icon: 'file-code', color: '#6c5ce7' },
      'json': { icon: 'file-code', color: '#2ecc71' },
      'xml': { icon: 'file-code', color: '#e74c3c' },
      'mp3': { icon: 'file-audio', color: '#9b59b6' },
      'wav': { icon: 'file-audio', color: '#8e44ad' },
      'ogg': { icon: 'file-audio', color: '#9b59b6' },
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

  // Search files
  async searchFiles(query: string, folderId: number = 0): Promise<CategorizedFiles> {
    try {
      const allFiles = await this.getCategorizedFiles(folderId);
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
}

export default new DirectPCloudService();
export { DirectPCloudService };
