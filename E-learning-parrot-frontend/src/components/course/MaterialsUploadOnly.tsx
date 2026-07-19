import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image, Video, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { usePCloud } from '@/hooks/usePCloud';
import { PCloudFile } from '@/services/pcloudService';

interface UploadedFile extends File {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  pcloudFile?: PCloudFile;
}

interface MaterialsUploadOnlyProps {
  courseId?: number;
  onUploadComplete?: (files: PCloudFile[]) => void;
  maxFiles?: number;
  maxSize?: number;
}

const MaterialsUploadOnly: React.FC<MaterialsUploadOnlyProps> = ({
  courseId,
  onUploadComplete,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024 // 100MB
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadFile } = usePCloud(courseId);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
  }, [maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    },
    maxSize,
    maxFiles: maxFiles - files.length,
    disabled: isUploading
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadSingleFile = async (file: UploadedFile): Promise<PCloudFile | null> => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === file.id && f.progress < 90) {
            return { ...f, progress: Math.min(f.progress + 10, 90) };
          }
          return f;
        }));
      }, 200);

      const pcloudFile = await uploadFile(file, courseId);
      
      clearInterval(progressInterval);
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'completed', 
          progress: 100,
          pcloudFile 
        } : f
      ));

      return pcloudFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'error', 
          error: errorMessage 
        } : f
      ));

      return null;
    }
  };

  const uploadAllFiles = async () => {
    setIsUploading(true);
    
    const pendingFiles = files.filter(f => f.status === 'pending');
    const uploadPromises = pendingFiles.map(file => uploadFile(file));
    
    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((result): result is PCloudFile => result !== null);
      
      if (successfulUploads.length > 0) {
        toast({
          title: "Upload Complete",
          description: `${successfulUploads.length} file(s) uploaded to pCloud successfully`,
        });
        
        if (onUploadComplete) {
          onUploadComplete(successfulUploads);
        }
      }
      
      if (pendingFiles.length !== successfulUploads.length) {
        toast({
          variant: "destructive",
          title: "Some Uploads Failed",
          description: `${pendingFiles.length - successfulUploads.length} file(s) failed to upload`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "An error occurred while uploading files to pCloud",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-4 w-4 text-purple-500" />;
    } else if (file.type.includes('pdf') || file.type.includes('document')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'uploading':
        return <Badge variant="default">Uploading</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Materials to pCloud
        </CardTitle>
        <p className="text-sm text-gray-600">
          Files will be stored directly in pCloud cloud storage
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Supported: Images, Videos, PDFs, Documents, Archives
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max {maxFiles} files, {Math.round(maxSize / 1024 / 1024)}MB each
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Files to Upload to pCloud</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="h-1 mt-1" />
                    )}
                    {file.status === 'error' && (
                      <p className="text-xs text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(file.status)}
                    {getStatusBadge(file.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                disabled={isUploading}
              >
                Clear All
              </Button>
              <Button
                onClick={uploadAllFiles}
                disabled={isUploading || files.every(f => f.status !== 'pending')}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading to pCloud...
                  </>
                ) : (
                  'Upload to pCloud'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Storage Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">pCloud Storage</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Files are stored directly in pCloud cloud storage</li>
            <li>• No database storage - pure cloud solution</li>
            <li>• Accessible from anywhere with your pCloud account</li>
            <li>• Automatic backup and version control</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MaterialsUploadOnly;
