import { useEffect, useState, FormEvent } from "react";
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
import { Loader2, FileText, UploadCloud, Cloud, Download, Eye, Trash2, Image, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Course {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
}

interface PCloudFile {
  fileid: number;
  name: string;
  size?: number;
  isfolder?: boolean;
}

interface PCloudFilesResponse {
  images: PCloudFile[];
  videos: PCloudFile[];
  others: PCloudFile[];
}

const API_BASE_URL = "https://api.pcloud.com";
const ACCESS_TOKEN = "kqNT7Z8BpwhA0d4MFZVgju0kZbR12PpsX93VWhpTOL5i4jVefcDdX";

const CourseMaterialsSimple = () => {
  const { toast } = useToast();

  const [courses] = useState<Course[]>([
    { id: 1, title: "English 101", description: "Basic English Course", status: "active" },
    { id: 2, title: "Mathematics 101", description: "Basic Mathematics Course", status: "active" },
    { id: 3, title: "Science 101", description: "Basic Science Course", status: "active" },
  ]);

  const [selectedCourseId, setSelectedCourseId] = useState<number>(1);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState<PCloudFilesResponse>({
    images: [],
    videos: [],
    others: [],
  });

  // Fetch files from pCloud API
  const fetchFiles = async () => {
    setLoadingFiles(true);
    
    try {
      const coursePath = selectedCourseId === 1 ? '/parrotacademy' : 
                        selectedCourseId === 2 ? '/parrotacademy' : 
                        '/parrotacademy';
      
      // First try to create the folder if it doesn't exist
      try {
        await fetch(`${API_BASE_URL}/createfolder?path=${coursePath}&access_token=${ACCESS_TOKEN}`);
      } catch (e) {
        // Folder might already exist, continue
      }
      
      // Now list the folder contents
      const response = await fetch(`${API_BASE_URL}/listfolder?path=${coursePath}&access_token=${ACCESS_TOKEN}`);
      const data = await response.json();
      
      if (data.result === 0) {
        const files = data.metadata.contents || [];
        
        const categorized: PCloudFilesResponse = {
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
      } else {
        // Show the actual error to help debug
        toast({
          variant: "destructive",
          title: "pCloud API Error",
          description: `Error ${data.result}: ${data.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Could not fetch pCloud files: " + err.message,
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);

    try {
      // First ensure the folder exists
      const folderPath = '/parrotacademy';
      try {
        await fetch(`${API_BASE_URL}/createfolder?path=${folderPath}&access_token=${ACCESS_TOKEN}`);
      } catch (e) {
        // Folder might already exist, continue
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      
      // Get the folder ID for parrotacademy
      const folderResponse = await fetch(`${API_BASE_URL}/listfolder?path=${folderPath}&access_token=${ACCESS_TOKEN}`);
      const folderData = await folderResponse.json();
      
      if (folderData.result === 0) {
        formData.append("folderid", folderData.metadata.folderid.toString());
      } else {
        // Use root folder as fallback
        formData.append("folderid", "0");
      }
      
      formData.append("access_token", ACCESS_TOKEN);

      const response = await fetch(`${API_BASE_URL}/uploadfile`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.result === 0) {
        toast({
          title: "Uploaded",
          description: `File "${uploadFile.name}" uploaded successfully`,
        });

        setUploadDialogOpen(false);
        setUploadDescription("");
        setUploadFile(null);

        await fetchFiles();
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err.message || "Failed to upload file",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileid: number) => {
    if (!window.confirm("Delete this file?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/deletefile?fileid=${fileid}&access_token=${ACCESS_TOKEN}`);
      const data = await response.json();
      
      if (data.result === 0) {
        toast({
          title: "Deleted",
          description: "File deleted successfully",
        });
        await fetchFiles();
      } else {
        throw new Error(data.error || "Delete failed");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message || "Failed to delete file",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Course Materials</h1>
          <p className="text-sm text-muted-foreground">
            Each course is stored in its own folder in pCloud under <code>/parrotacademy</code>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - Courses */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">My Courses</CardTitle>
            <CardDescription className="text-xs">
              Choose a course to manage its pCloud folder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto text-sm">
            <ul className="space-y-1">
              {courses.map((course) => {
                const isActive = course.id === selectedCourseId;
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-md border text-xs flex items-center justify-between gap-2 ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                      onClick={() => setSelectedCourseId(course.id)}
                    >
                      <span className="truncate flex-1">{course.title}</span>
                      {course.status && (
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {course.status}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="font-medium text-gray-900 mb-1">Current Status:</p>
              <ul className="text-gray-800 space-y-1">
                <li>• API URL: {API_BASE_URL}</li>
                <li>• Access Token: {ACCESS_TOKEN.substring(0, 20)}...</li>
                <li>• Course Path: /parrotacademy</li>
                <li>• Selected Course: {selectedCourseId}</li>
                <li>• Loading: {loadingFiles ? 'Yes' : 'No'}</li>
                <li>• Total Files: {files.images.length + files.videos.length + files.others.length}</li>
              </ul>
            </div>
            
            <Button size="sm" variant="outline" onClick={() => {
              console.log('Testing API call...');
              fetch(`${API_BASE_URL}/listfolder?path=/&access_token=${ACCESS_TOKEN}`)
                .then(res => res.json())
                .then(data => console.log('Root folder:', data))
                .catch(err => console.error('Error:', err));
            }}>
              Test Root Folder Access
            </Button>
          </CardContent>
        </Card>

        {/* Main */}
        <div className="lg:col-span-3 space-y-4">
          {/* Upload Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  Upload Materials
                </CardTitle>
                <CardDescription>
                  Upload files directly to the pCloud folder for this course.
                </CardDescription>
              </div>

              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9">
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Course Material</DialogTitle>
                    <DialogDescription>
                      Files will be stored in <code>/parrotacademy/course_{selectedCourseId}</code>.
                    </DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleUpload}>
                    <div className="space-y-2">
                      <Label htmlFor="material-description">Description (optional)</Label>
                      <Textarea
                        id="material-description"
                        placeholder="Describe this material (e.g. Week 1 slides, Homework 2, etc.)"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        className="min-h-[80px] text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material-file">Upload file</Label>
                      <Input
                        id="material-file"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setUploadFile(file);
                        }}
                        disabled={uploading}
                        accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Supported: video, audio, images, PDF, Word, PowerPoint, Excel and other common
                        documents.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={uploading || !uploadFile} className="w-full sm:w-auto">
                        {uploading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          "Upload"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
          </Card>

          {/* Files Card */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  pCloud Materials
                </CardTitle>
                <CardDescription>
                  Files for this course in pCloud{" "}
                  <code>/parrotacademy</code>.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchFiles}>
                <Loader2 className={`w-4 h-4 mr-2 ${loadingFiles ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>

            <CardContent>
              {loadingFiles ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading pCloud materials...</span>
                </div>
              ) : (
                <div className="space-y-6 text-sm">
                  {/* Images */}
                  {files.images.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Image className="w-4 h-4 text-blue-500" />
                        Images ({files.images.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {files.images.map((file) => (
                          <div key={file.fileid} className="border rounded-lg p-3 space-y-2">
                            <div className="aspect-square bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                              <img
                                src={`${API_BASE_URL}/getthumb?fileid=${file.fileid}&size=256x256&access_token=${ACCESS_TOKEN}`}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-xs">
                              <p className="font-medium truncate">{file.name}</p>
                              <div className="flex gap-1 mt-1">
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`${API_BASE_URL}/getfilelink?fileid=${file.fileid}&access_token=${ACCESS_TOKEN}`} target="_blank">
                                    <Download className="w-3 h-3" />
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(file.fileid)}
                                  className="text-red-500"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {files.videos.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-500" />
                        Videos ({files.videos.length})
                      </h4>
                      <div className="space-y-2">
                        {files.videos.map((file) => (
                          <div
                            key={file.fileid}
                            className="border rounded-lg p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Video className="w-8 h-8 text-purple-500" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" asChild>
                                <a href={`${API_BASE_URL}/getvideolink?fileid=${file.fileid}&access_token=${ACCESS_TOKEN}`} target="_blank">
                                  <Eye className="w-3 h-3" />
                                </a>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a href={`${API_BASE_URL}/getfilelink?fileid=${file.fileid}&access_token=${ACCESS_TOKEN}`} target="_blank">
                                  <Download className="w-3 h-3" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(file.fileid)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other files */}
                  {files.others.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Other Files ({files.others.length})
                      </h4>
                      <div className="space-y-2">
                        {files.others.map((file) => (
                          <div
                            key={file.fileid}
                            className="border rounded-lg p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-8 h-8 text-gray-500" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" asChild>
                                <a href={`${API_BASE_URL}/getfilelink?fileid=${file.fileid}&access_token=${ACCESS_TOKEN}`} target="_blank">
                                  <Download className="w-3 h-3" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(file.fileid)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {files.images.length === 0 &&
                    files.videos.length === 0 &&
                    files.others.length === 0 && (
                      <div className="text-center py-8">
                        <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No files stored yet for this course</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Upload some materials to get started.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CourseMaterialsSimple;
