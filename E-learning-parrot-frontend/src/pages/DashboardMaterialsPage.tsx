import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, FolderOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import DirectMaterialsGallery from '@/components/course/DirectMaterialsGallery';
import { PCloudFile } from '@/services/directPCloudService';

const DashboardMaterialsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Course Materials</h1>
            <p className="text-gray-600">
              {courseId ? `Course ID: ${courseId}` : 'All Course Materials'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            pCloud Storage
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            API Only
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <DirectMaterialsGallery
          courseId={courseId ? parseInt(courseId) : undefined}
          allowDelete={true}
          onFileSelect={(file) => {
            console.log('Selected file:', file);
          }}
        />
      </div>

    </div>
  );
};

export default DashboardMaterialsPage;
