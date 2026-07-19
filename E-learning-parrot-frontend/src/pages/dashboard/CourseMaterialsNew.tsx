import { useState, FormEvent } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  FileText,
  UploadCloud,
  Cloud,
  Download,
  Eye,
  Trash2,
  Image,
  Video,
} from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import directPCloudService, { PCloudFile, CategorizedFiles } from "@/services/directPCloudService";
import { useDirectPCloud } from "@/hooks/useDirectPCloud";

interface Course {
  id: number;
  title?: string | null;
  description?: string | null;
  status?: string | null;
}

const CourseMaterials = () => {
  const { toast } = useToast();

  const [courses] = useState<Course[]>([
    { id: 1, title: "English 101", description: "Basic English Course", status: "active" },
    { id: 2, title: "Mathematics 101", description: "Basic Mathematics Course", status: "active" },
    { id: 3, title: "Science 101", description: "Basic Science Course", status: "active" }
  ]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(1);

  // pCloud Hook - Use specific folder ID for each course
  const {
    files,
    loading: pcloudLoading,
    error: pcloudError,
    refreshFiles,
    uploadFile: pcloudUploadFile,
    deleteFile,
  } = useDirectPCloud(selectedCourseId || 0);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !selectedUploadFile) return;

    setUploading(true);

    try {
      // Upload to specific course folder
      await pcloudUploadFile(selectedUploadFile, selectedCourseId);

      toast({
        variant: "success",
        title: "Material uploaded",
        description: `Your file "${selectedUploadFile.name}" was uploaded successfully to course folder.`,
      });

      await refreshFiles();

      setUploadDialogOpen(false);
      setUploadDescription("");
      setSelectedUploadFile(null);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error?.message || "Failed to upload material to pCloud.",
      });

    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Course Materials</h1>
          <p className="text-sm text-muted-foreground">
            Select a course and manage its learning materials in pCloud.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Sidebar Courses */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">My Courses</CardTitle>
            <CardDescription className="text-xs">Choose a course to manage files.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto text-sm">
            <ul className="space-y-1">
              {courses.map((course) => {
                const active = course.id === selectedCourseId;
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`w-full px-3 py-2 rounded-md border text-xs text-left 
                      ${active ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:bg-muted"}`}
                    >
                      {course.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">

          {/* Upload Section */}
          <Card>
            <CardHeader className="flex justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  Upload Materials
                </CardTitle>
                <CardDescription>
                  Upload files to course-specific pCloud folder.
                </CardDescription>
              </div>

              {selectedCourseId && (
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Upload material</Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload course material</DialogTitle>
                      <DialogDescription>
                        Provide a description and select a file for {courses.find(c => c.id === selectedCourseId)?.title}.
                      </DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleUpload}>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={uploadDescription}
                          onChange={(e) => setUploadDescription(e.target.value)}
                          placeholder="Describe this material (e.g. Week 1 slides, Homework 2, etc.)"
                        />
                      </div>

                      <div>
                        <Label>File</Label>
                        <Input
                          type="file"
                          onChange={(e) => setSelectedUploadFile(e.target.files?.[0] ?? null)}
                          disabled={uploading}
                          accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Supported: video, audio, images, PDF, Word, PowerPoint, Excel and other common documents.
                        </p>
                      </div>

                      <DialogFooter>
                        <Button type="submit" disabled={uploading || !selectedUploadFile}>
                          {uploading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading to pCloud...
                            </span>
                          ) : (
                            "Upload to pCloud"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
          </Card>

          {/* pCloud Files Section */}
          <Card>
            <CardHeader className="flex justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  pCloud Materials
                </CardTitle>
                <CardDescription>
                  Files stored in pCloud for {selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.title : 'selected course'}.
                </CardDescription>
              </div>

              <Button variant="outline" size="sm" onClick={refreshFiles}>
                <Loader2 className={`w-4 h-4 mr-2 ${pcloudLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>

            <CardContent>
              {!selectedCourseId ? (
                <p className="text-sm text-muted-foreground">Select a course first.</p>
              ) : pcloudLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading from pCloud...
                </p>
              ) : pcloudError ? (
                <p className="text-sm text-red-500">{pcloudError}</p>
              ) : (
                <>
                  {/* Images */}
                  {files.images.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <Image className="w-4 h-4 text-blue-500" />
                        Images ({files.images.length})
                      </h4>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {files.images.map((file) => (
                          <div key={file.id} className="border p-2 rounded-md">
                            <img
                              src={directPCloudService.getThumbnailUrl(file.fileid!)}
                              className="w-full h-32 object-cover rounded"
                            />
                            <p className="text-xs mt-2 truncate font-medium">{file.name}</p>

                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="outline" asChild>
                                <a href={directPCloudService.getDownloadLink(file.fileid!)} download>
                                  <Download className="w-3 h-3" />
                                </a>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500"
                                onClick={() => deleteFile(file.fileid!)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {files.videos.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <Video className="w-4 h-4 text-purple-500" />
                        Videos ({files.videos.length})
                      </h4>

                      <div className="space-y-2">
                        {files.videos.map((file) => (
                          <div
                            key={file.id}
                            className="border rounded-md p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Video className="w-8 h-8 text-purple-500" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500">{directPCloudService.formatFileSize(file.size)}</p>
                              </div>
                            </div>

                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" asChild>
                                <a href={directPCloudService.getVideoLink(file.fileid!)} target="_blank">
                                  <Eye className="w-3 h-3" />
                                </a>
                              </Button>

                              <Button size="sm" variant="outline" asChild>
                                <a href={directPCloudService.getDownloadLink(file.fileid!)} download>
                                  <Download className="w-3 h-3" />
                                </a>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500"
                                onClick={() => deleteFile(file.fileid!)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Files */}
                  {files.others.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        Other Files ({files.others.length})
                      </h4>

                      <div className="space-y-2">
                        {files.others.map((file) => (
                          <div key={file.id} className="border rounded-md p-3 flex justify-between">
                            <div>
                              <p className="font-medium text-sm">{file.name}</p>
                              <p className="text-xs text-gray-500">{directPCloudService.formatFileSize(file.size)}</p>
                            </div>

                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" asChild>
                                <a href={directPCloudService.getDownloadLink(file.fileid!)} download>
                                  <Download className="w-3 h-3" />
                                </a>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500"
                                onClick={() => deleteFile(file.fileid!)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {files.images.length === 0 &&
                    files.videos.length === 0 &&
                    files.others.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <Cloud className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        No files found in this course folder.
                        <p className="text-sm mt-1">Upload materials to get started.</p>
                      </div>
                    )}
                </>
              )}
            </CardContent>
          </Card>

          {/* API Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">pCloud API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-900 mb-1">Current Settings:</p>
                <ul className="text-blue-800 space-y-1">
                  <li>• API Token: kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX</li>
                  <li>• Course Path: {selectedCourseId ? `/parrotacademy/${courses.find(c => c.id === selectedCourseId)?.title?.toLowerCase()}` : '/parrotacademy'}</li>
                  <li>• Fetching: Path-based folder access</li>
                  <li>• Storage: Direct pCloud cloud storage</li>
                </ul>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default CourseMaterials;
