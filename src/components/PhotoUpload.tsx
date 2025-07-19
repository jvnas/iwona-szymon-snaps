
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Heart, ArrowRight, X, Image, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useToast } from '@/components/ui/use-toast';

interface Photo {
  id: string;
  url: string;
  created_at: number;
  type: 'image' | 'video';
}

interface PhotoUploadProps {
  onUploadSuccess: () => void;
}

// Symulacja dla środowiska lokalnego
const simulateLocalUpload = async (file: File): Promise<Response> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileId = `local-${Date.now()}`;
      const fileUrl = URL.createObjectURL(file);
      const newPhoto: Photo = {
        id: fileId,
        url: fileUrl,
        created_at: Date.now(),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      };
      
      const localPhotosData = localStorage.getItem('localPhotos');
      const localPhotos = localPhotosData ? JSON.parse(localPhotosData) : [];
      localPhotos.unshift(newPhoto);
      localStorage.setItem('localPhotos', JSON.stringify(localPhotos));
      
      const mockResponse = new Response(JSON.stringify(newPhoto), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
      resolve(mockResponse);
    }, 1000);
  });
};

const PhotoUpload = ({ onUploadSuccess }: PhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<File[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (uploadSuccess) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [uploadSuccess]);

  const handlePhotoUpload = async () => {
    const filesToUpload = selectedFilesRef.current;
    if (filesToUpload.length === 0) {
      toast({
        title: "Brak plików",
        description: "Wybierz zdjęcia lub filmy do przesłania.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileId = `file-${i}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        const MAX_SIZE = 100 * 1024 * 1024; // 100MB
        if (file.size > MAX_SIZE) {
          toast({
            title: "Plik zbyt duży",
            description: `${file.name} przekracza limit 100MB.`,
            variant: "destructive"
          });
          continue;
        }
        
        const formData = new FormData();
        formData.append('file', file);

        try {
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const currentProgress = prev[fileId] || 0;
              return { ...prev, [fileId]: Math.min(90, currentProgress + Math.random() * 10) };
            });
          }, 300);

          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const response = isLocal 
            ? await simulateLocalUpload(file)
            : await fetch('/api/photos', { method: 'POST', body: formData });

          clearInterval(progressInterval);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            toast({
              title: "Błąd przesyłania",
              description: `Nie udało się przesłać ${file.name}: ${errorData.error || response.statusText}`,
              variant: "destructive"
            });
          } else {
            setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
            successCount++;
          }
        } catch (error) {
          toast({
            title: "Błąd sieci",
            description: `Problem z przesłaniem ${file.name}. Sprawdź połączenie.`,
            variant: "destructive"
          });
        }
      }
      
      if (successCount > 0) {
        setUploadSuccess(true);
        onUploadSuccess();
      }

    } catch (error) {
      toast({
        title: "Błąd",
        description: "Wystąpił nieoczekiwany błąd podczas przesyłania.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
      selectedFilesRef.current = [];
      setUploadProgress({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
        if (!isValid) {
          toast({
            title: "Nieobsługiwany format",
            description: `${file.name} nie jest zdjęciem ani filmem.`,
            variant: "destructive"
          });
        }
        return isValid;
      });
      const newFiles = [...selectedFilesRef.current, ...validFiles];
      setSelectedFiles(newFiles);
      selectedFilesRef.current = newFiles;
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    selectedFilesRef.current = updatedFiles;
  };
  
  const triggerFileInput = (captureMode: 'user' | null = null) => {
    if (fileInputRef.current) {
      if (captureMode) {
        fileInputRef.current.setAttribute('capture', captureMode);
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const cancelSelection = () => {
    setSelectedFiles([]);
    selectedFilesRef.current = [];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  if (uploadSuccess) {
    return (
      <div className="text-center py-8 px-6 bg-white rounded-2xl shadow-xl border border-green-100">
        <Heart className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-serif text-gray-800 mb-2">Super, mamy to!</h3>
        <p className="text-gray-600 mb-6">Dziękujemy! Twoje pliki są już w galerii.</p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => setUploadSuccess(false)} variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-50">
            Dodaj więcej
          </Button>
          <Link to="/gallery">
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
              Zobacz galerię <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center max-w-sm mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      
      {selectedFiles.length > 0 ? (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-md font-semibold mb-2 text-gray-700">Wybrane pliki:</h4>
          <ul className="space-y-2 text-left text-sm text-gray-600 max-h-60 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <li key={index} className="flex flex-col">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center min-w-0">
                    {file.type.startsWith('image/') 
                      ? <Image className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                      : <Film className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" />}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(index)} className="text-red-500 hover:text-red-700 h-6 w-6 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {isUploading && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-yellow-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress[`file-${index}`] || 0}%` }}></div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Button onClick={handlePhotoUpload} disabled={isUploading} className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white w-full">
            {isUploading ? 'Przesyłanie...' : `Prześlij ${selectedFiles.length} plik(ów)`}
          </Button>
          <Button onClick={cancelSelection} variant="link" className="text-gray-500 hover:text-gray-700" disabled={isUploading}>
            Anuluj
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-yellow-400 rounded-2xl p-8 bg-yellow-50">
           <Upload className="w-12 h-12 mb-4 mx-auto text-yellow-600" />
           <p className="text-lg font-semibold mb-2 text-gray-800">Podziel się wspomnieniami</p>
           <p className="text-sm text-gray-600 mb-6">Dodaj zdjęcia i filmy z tego wyjątkowego dnia.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={() => triggerFileInput('user')} disabled={isUploading} variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-stone-100 bg-white">
              <Camera className="w-5 h-5 mr-2" />
              Zrób Selfie
            </Button>
            <Button onClick={() => triggerFileInput(null)} disabled={isUploading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Image className="w-5 h-5 mr-2" />
              Wybierz z Galerii
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
