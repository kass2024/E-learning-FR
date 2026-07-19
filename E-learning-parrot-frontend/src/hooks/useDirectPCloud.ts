import { useState, useEffect } from 'react';
import directPCloudService, { PCloudFile, CategorizedFiles, DirectPCloudService } from '@/services/directPCloudService';

export interface UseDirectPCloudReturn {
  files: CategorizedFiles;
  loading: boolean;
  error: string | null;
  refreshFiles: () => Promise<void>;
  uploadFile: (file: File, folderId?: number) => Promise<PCloudFile>;
  deleteFile: (fileId: number) => Promise<void>;
  searchFiles: (query: string) => CategorizedFiles;
}

const useDirectPCloud = (courseId?: number): UseDirectPCloudReturn => {
  const [files, setFiles] = useState<CategorizedFiles>({
    images: [],
    videos: [],
    others: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map course ID to folder path
  const getCoursePath = (id?: number): string => {
    const coursePaths: Record<number, string> = {
      1: '/parrotacademy/english',
      2: '/parrotacademy/mathematics', 
      3: '/parrotacademy/science'
    };
    return coursePaths[id || 1] || '/parrotacademy';
  };

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the exact API URL you provided
      const apiUrl = "https://api.pcloud.com/listfolder?path=/parrotacademy&access_token=kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX";
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.result === 0) {
        const files = data.metadata.contents || [];
        
        const categorized: CategorizedFiles = {
          images: [],
          videos: [],
          others: []
        };

        files.forEach((file: any) => {
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

        setFiles(categorized);
        console.log('Successfully loaded files:', data);
      } else {
        // If folder doesn't exist, create it and try again
        if (data.result === 2005) {
          console.log('Folder does not exist, creating it...');
          try {
            // Create the parrotacademy folder
            const createUrl = "https://api.pcloud.com/createfolder?path=/parrotacademy&access_token=kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX";
            const createResponse = await fetch(createUrl);
            const createData = await createResponse.json();
            
            if (createData.result === 0) {
              console.log('Folder created successfully, retrying file list...');
              
              // Try to list again
              const retryResponse = await fetch(apiUrl);
              const retryData = await retryResponse.json();
              
              if (retryData.result === 0) {
                const files = retryData.metadata.contents || [];
                const categorized: CategorizedFiles = {
                  images: [],
                  videos: [],
                  others: []
                };
                
                files.forEach((file: any) => {
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
                
                setFiles(categorized);
                console.log('Files loaded after creating folder:', retryData);
              } else {
                setError(`Failed to list files after creating folder: ${retryData.error || 'Unknown error'}`);
              }
            } else {
              setError(`Failed to create folder: ${createData.error || 'Unknown error'}`);
            }
          } catch (createError) {
            setError('Failed to create folder: ' + createError);
          }
        } else {
          setError(`API Error ${data.result}: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const refreshFiles = async () => {
    await loadFiles();
  };

  const uploadFile = async (file: File, folderId?: number): Promise<PCloudFile> => {
    try {
      console.log('Starting upload for file:', file.name);
      
      // First ensure the parrotacademy folder exists and get its ID
      let targetFolderId = 0;
      
      try {
        const listUrl = "https://api.pcloud.com/listfolder?path=/parrotacademy&access_token=kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX";
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();
        
        if (listData.result === 0) {
          targetFolderId = listData.metadata.folderid;
          console.log('Found parrotacademy folder with ID:', targetFolderId);
        }
      } catch (listError) {
        console.log('Folder list failed, trying to create folder');
      }
      
      // If folder doesn't exist, create it
      if (targetFolderId === 0) {
        try {
          const createUrl = "https://api.pcloud.com/createfolder?path=/parrotacademy&access_token=kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX";
          const createResponse = await fetch(createUrl);
          const createData = await createResponse.json();
          
          if (createData.result === 0) {
            targetFolderId = createData.metadata.folderid;
            console.log('Created parrotacademy folder with ID:', targetFolderId);
          } else {
            throw new Error(`Failed to create folder: ${createData.error || 'Unknown error'}`);
          }
        } catch (createError) {
          console.error('Create folder error:', createError);
          throw new Error(`Failed to create parrotacademy folder: ${createError.message}`);
        }
      }
      
      // Upload file to the parrotacademy folder using correct pCloud API format
      const formData = new FormData();
      
      // Add parameters first (as per documentation: parameters must come before files)
      formData.append("folderid", targetFolderId.toString());
      formData.append("access_token", "kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX");
      formData.append("nopartial", "1"); // Ensure complete upload
      formData.append("renameifexists", "0"); // Overwrite if exists
      
      // Add the file (browser automatically includes filename)
      formData.append("file", file);
      
      console.log('Uploading to folder ID:', targetFolderId);
      console.log('File size:', file.size, 'bytes');
      
      const uploadResponse = await fetch("https://api.pcloud.com/uploadfile", {
        method: "POST",
        body: formData,
      });
      
      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData);
      
      if (uploadData.result === 0) {
        // Return the first file metadata (as per API response format)
        if (uploadData.metadata && uploadData.metadata.length > 0) {
          return uploadData.metadata[0];
        } else {
          throw new Error('Upload succeeded but no file metadata returned');
        }
      } else {
        // Handle specific error codes
        let errorMessage = `Upload failed: ${uploadData.error || 'Unknown error'} (Code: ${uploadData.result})`;
        
        switch(uploadData.result) {
          case 2000:
            errorMessage = 'Login failed. Check your access token.';
            break;
          case 2001:
            errorMessage = 'Invalid file name.';
            break;
          case 2003:
            errorMessage = 'Access denied. Check folder permissions.';
            break;
          case 2005:
            errorMessage = 'Target folder does not exist.';
            break;
          case 2008:
            errorMessage = 'Storage quota exceeded.';
            break;
          case 2041:
            errorMessage = 'Connection broken during upload.';
            break;
          case 5000:
            errorMessage = 'Internal server error. Please try again.';
            break;
          case 5001:
            errorMessage = 'Internal upload error.';
            break;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Upload failed');
    }
  };

  const deleteFile = async (fileId: number): Promise<void> => {
    try {
      const deleteUrl = `https://api.pcloud.com/deletefile?fileid=${fileId}&access_token=kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX`;
      
      const response = await fetch(deleteUrl);
      const data = await response.json();
      
      if (data.result !== 0) {
        throw new Error(data.error || 'Delete failed');
      }
      
      await refreshFiles();
    } catch (error: any) {
      throw new Error(error.message || 'Delete failed');
    }
  };

  const searchFiles = (query: string): CategorizedFiles => {
    const searchQuery = query.toLowerCase();

    const filterArray = (files: PCloudFile[]) =>
      files.filter(file => file.name.toLowerCase().includes(searchQuery));

    return {
      images: filterArray(files.images),
      videos: filterArray(files.videos),
      others: filterArray(files.others)
    };
  };

  useEffect(() => {
    loadFiles();
  }, [courseId]);

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

export default useDirectPCloud;
