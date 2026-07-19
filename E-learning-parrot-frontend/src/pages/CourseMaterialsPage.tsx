import React from 'react';
import { useParams } from 'react-router-dom';
import SimpleMaterialsGallery from '@/components/course/SimpleMaterialsGallery';

const CourseMaterialsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Course {courseId || 'Materials'}
        </h1>
        <p className="text-gray-600 mt-2">
          Access and manage your course materials
        </p>
      </div>
      
      <SimpleMaterialsGallery 
        courseId={courseId ? parseInt(courseId) : undefined}
        allowDelete={true} // Set based on user role
        onFileSelect={(file) => {
          console.log('Selected file:', file);
        }}
      />
    </div>
  );
};

export default CourseMaterialsPage;
