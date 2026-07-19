import React, { useState } from 'react';
import { BookOpen, Upload, FolderOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import MaterialsUpload from './MaterialsUpload';
import MaterialsGallery from './MaterialsGallery';
import { PCloudFile } from '@/services/pcloudService';

interface CourseMaterialsProps {
  courseId?: number;
  courseName?: string;
  instructorView?: boolean;
  onMaterialsUpdate?: (files: PCloudFile[]) => void;
}

const CourseMaterials: React.FC<CourseMaterialsProps> = ({
  courseId,
  courseName = 'Course Materials',
  instructorView = false,
  onMaterialsUpdate
}) => {
  const [activeTab, setActiveTab] = useState('gallery');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = (files: PCloudFile[]) => {
    if (onMaterialsUpdate) {
      onMaterialsUpdate(files);
    }
    // Switch to gallery tab after upload
    setActiveTab('gallery');
    // Refresh the gallery
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">{courseName}</h2>
            <p className="text-gray-600">
              {instructorView ? 'Manage course materials' : 'Access course materials'}
            </p>
          </div>
        </div>
        
        {instructorView && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Instructor Mode
            </Badge>
          </div>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Materials Gallery
          </TabsTrigger>
          {instructorView && (
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Materials
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="gallery" className="mt-6">
          <MaterialsGallery
            key={refreshKey} // Force re-render when refreshKey changes
            courseId={courseId}
            allowDelete={instructorView}
            onFileSelect={(file) => {
              console.log('Selected file:', file);
            }}
          />
        </TabsContent>

        {instructorView && (
          <TabsContent value="upload" className="mt-6">
            <div className="space-y-6">
              <MaterialsUpload
                courseId={courseId}
                onUploadComplete={handleUploadComplete}
                maxFiles={20}
                maxSize={200 * 1024 * 1024} // 200MB
              />
              
              {/* Upload Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Upload Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <strong>Supported Formats:</strong> Images (JPG, PNG, GIF, WebP), Videos (MP4, MOV, AVI, WebM), Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX), Archives (ZIP, RAR)
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <strong>File Size:</strong> Maximum 200MB per file
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <strong>File Naming:</strong> Use descriptive names for better organization
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <strong>Organization:</strong> Files are automatically categorized by type (Images, Videos, Documents)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default CourseMaterials;
