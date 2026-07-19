import React, { useState } from 'react';
import { Search, Download, Eye, FolderOpen, Video, Image, File, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { usePCloud } from '@/hooks/usePCloud';
import pcloudService, { PCloudFile } from '@/services/pcloudService';

interface SimpleMaterialsGalleryProps {
  courseId?: number;
  allowDelete?: boolean;
  onFileSelect?: (file: PCloudFile) => void;
}

const SimpleMaterialsGallery: React.FC<SimpleMaterialsGalleryProps> = ({
  courseId,
  allowDelete = false,
  onFileSelect
}) => {
  const { files, loading, error, refreshFiles, deleteFile, searchFiles } = usePCloud(courseId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<PCloudFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const filteredFiles = searchFiles(searchQuery);
  const totalFiles = filteredFiles.images.length + filteredFiles.videos.length + filteredFiles.others.length;

  const handleDelete = async (file: PCloudFile) => {
    if (!file.fileid) return;

    try {
      await deleteFile(file.fileid);
      toast({
        title: "Success",
        description: `${file.name} deleted successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file",
      });
    }
  };

  const handlePreview = (file: PCloudFile) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const handleDownload = (file: PCloudFile) => {
    if (!file.fileid) return;
    
    const link = document.createElement('a');
    link.href = pcloudService.getDownloadLink(file.fileid, file.name);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (file: PCloudFile) => {
    if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <Image className="w-8 h-8 text-blue-500" />;
    } else if (file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
      return <Video className="w-8 h-8 text-purple-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const renderFileCard = (file: PCloudFile) => (
    <Card key={file.id} className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3 relative overflow-hidden">
          {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && file.fileid ? (
            <>
              <img
                src={pcloudService.getThumbnailUrl(file.fileid)}
                alt={file.name}
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => handlePreview(file)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center">
              {getFileIcon(file)}
              <p className="text-xs text-gray-500 mt-2">
                {file.name.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-sm truncate" title={file.name}>
            {file.name}
          </h4>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {pcloudService.formatFileSize(file.size)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {file.name.split('.').pop()?.toUpperCase()}
            </Badge>
          </div>

          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleDownload(file)}
            >
              <Download className="h-3 w-3" />
            </Button>
            
            {file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePreview(file)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            
            {allowDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(file)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFileGrid = (fileArray: PCloudFile[], title: string, icon: React.ReactNode) => {
    if (fileArray.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="secondary">{fileArray.length}</Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {fileArray.map(renderFileCard)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={refreshFiles}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" onClick={refreshFiles}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* File Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>Total: {totalFiles} files</span>
        <span>•</span>
        <span>Images: {filteredFiles.images.length}</span>
        <span>•</span>
        <span>Videos: {filteredFiles.videos.length}</span>
        <span>•</span>
        <span>Others: {filteredFiles.others.length}</span>
      </div>

      {/* File Categories */}
      {totalFiles === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' : 'Upload some materials to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {renderFileGrid(filteredFiles.images, 'Images', <Image className="h-5 w-5" />)}
          {renderFileGrid(filteredFiles.videos, 'Videos', <Video className="h-5 w-5" />)}
          {renderFileGrid(filteredFiles.others, 'Other Files', <File className="h-5 w-5" />)}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedFile?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedFile?.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && selectedFile.fileid && (
              <img
                src={pcloudService.getThumbnailUrl(selectedFile.fileid, '1024x1024')}
                alt={selectedFile.name}
                className="w-full h-auto rounded-lg"
              />
            )}
            
            {selectedFile?.name.match(/\.(mp4|mov|avi|webm|mkv)$/i) && selectedFile.fileid && (
              <video
                controls
                className="w-full h-auto rounded-lg"
                src={pcloudService.getVideoUrl(selectedFile.fileid)}
              >
                Your browser does not support the video tag.
              </video>
            )}
            
            {!selectedFile?.name.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm|mkv)$/i) && (
              <div className="text-center py-8">
                {getFileIcon(selectedFile!)}
                <p className="mt-4 text-gray-600">Preview not available for this file type</p>
                <Button
                  className="mt-4"
                  onClick={() => selectedFile && handleDownload(selectedFile)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleMaterialsGallery;
