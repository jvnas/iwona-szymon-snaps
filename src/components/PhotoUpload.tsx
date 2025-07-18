
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

// Lokalne przechowywanie zdjęć dla środowiska deweloperskiego
const localPhotos: Photo[] = [];

// Funkcja symulująca przesyłanie pliku w środowisku lokalnym
const simulateLocalUpload = async (file: File): Promise<Response> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const fileUrl = URL.createObjectURL(file);
      
      const newPhoto: Photo = {
        id: fileId,
        url: fileUrl,
        created_at: Date.now(),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      };
      
      localPhotos.unshift(newPhoto);
      
      // Zapisanie do localStorage
      localStorage.setItem('localPhotos', JSON.stringify(localPhotos));
      
      // Symulacja odpowiedzi HTTP
      const mockResponse = new Response(JSON.stringify(newPhoto), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
      
      resolve(mockResponse);
    }, 1000 + Math.random() * 1000); // Symulacja opóźnienia 1-2 sekundy
  });
};

const PhotoUpload = ({ onUploadSuccess }: PhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Funkcja do pobierania lokalnych zdjęć
  const getLocalPhotos = () => localPhotos;

  useEffect(() => {
    if (uploadSuccess) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [uploadSuccess]);

  const handlePhotoUpload = async () => {
    console.log('Attempting to upload photos...', selectedFiles);
    if (selectedFiles.length === 0) {
      toast({
        title: "Brak plików",
        description: "Wybierz zdjęcia lub filmy do przesłania",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileId = `file-${i}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        // Sprawdzenie rozmiaru pliku
        const MAX_SIZE = 100 * 1024 * 1024; // 100MB
        if (file.size > MAX_SIZE) {
          toast({
            title: "Plik zbyt duży",
            description: `${file.name} przekracza limit 100MB`,
            variant: "destructive"
          });
          continue;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);

        try {
          // Symulacja postępu przesyłania
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const currentProgress = prev[fileId] || 0;
              if (currentProgress < 90) {
                return { ...prev, [fileId]: currentProgress + Math.random() * 10 };
              }
              return prev;
            });
          }, 300);

          // Sprawdzenie czy jesteśmy w środowisku lokalnym
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          
          let response;
          if (isLocal) {
            // Symulacja API w środowisku lokalnym
            response = await simulateLocalUpload(file);
          } else {
            // Prawdziwe API na produkcji
            response = await fetch('/api/photos', {
              method: 'POST',
              body: formData,
            });
          }

          clearInterval(progressInterval);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Upload failed for ${file.name}: ${response.status} ${response.statusText}`, errorData);
            toast({
              title: "Błąd przesyłania",
              description: `Nie udało się przesłać ${file.name}: ${errorData.error || response.statusText}`,
              variant: "destructive"
            });
          } else {
            console.log(`Successfully uploaded: ${file.name}`);
            setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
            successCount++;
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast({
            title: "Błąd przesyłania",
            description: `Problem z przesłaniem ${file.name}. Sprawdź połączenie.`,
            variant: "destructive"
          });
        }
      }
      
      if (successCount > 0) {
        setUploadSuccess(true);
        onUploadSuccess();
        console.log(`${successCount} files uploaded successfully!`);
      } else {
        toast({
          title: "Brak przesłanych plików",
          description: "Żaden plik nie został przesłany. Spróbuj ponownie.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas przesyłania plików. Spróbuj ponownie.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
      setUploadProgress({});
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input value
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      
      // Sprawdzenie czy są to obsługiwane typy plików
      const validFiles = newFiles.filter(file => {
        const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
        if (!isValid) {
          toast({
            title: "Nieobsługiwany format",
            description: `${file.name} nie jest obsługiwanym formatem zdjęcia lub filmu`,
            variant: "destructive"
          });
        }
        return isValid;
      });
      
      setSelectedFiles(validFiles);
      console.log('Files selected:', validFiles.map(f => f.name));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAddMore = () => {
    setUploadSuccess(false);
    setSelectedFiles([]); // Clear selected files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    triggerFileInput();
  }

  if (uploadSuccess) {
    return (
      <div className="text-center py-8 px-6 bg-white rounded-2xl shadow-xl border border-green-100">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mb-4">
          <Heart className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-xl font-serif text-gray-800 mb-2">
          Super, mamy to!
        </h3>
        <p className="text-gray-600 mb-4">
          Twoje zdjęcia i filmy są już w galerii.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Możesz wrzucać dalej albo przeglądać fotki, które dodali inni! 🎉
        </p>
        <div className="flex justify-center gap-4">
          <Button 
            onClick={handleAddMore} 
            variant="outline"
            className="border-yellow-600 text-yellow-700 hover:bg-yellow-50 bg-white bg-opacity-90"
          >
            Dodaj więcej
          </Button>
          <Link to="/gallery">
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
              Zobacz galerię
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {selectedFiles.length > 0 ? (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 max-w-sm mx-auto">
          <h4 className="text-md font-semibold mb-2 text-gray-700">Wybrane pliki:</h4>
          <ul className="space-y-2 text-left text-sm text-gray-600 max-h-60 overflow-y-auto">
            {selectedFiles.map((file, index) => {
              const fileId = `file-${index}`;
              const progress = uploadProgress[fileId] || 0;
              const isImage = file.type.startsWith('image/');
              
              return (
                <li key={index} className="flex flex-col">
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center">
                      {isImage ? (
                        <Image className="w-4 h-4 mr-2 text-blue-500" />
                      ) : (
                        <Film className="w-4 h-4 mr-2 text-purple-500" />
                      )}
                      <span className="truncate max-w-[180px]">{file.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {isUploading && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div 
                        className="bg-yellow-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Button
            onClick={handlePhotoUpload}
            disabled={isUploading}
            className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 text-lg font-medium rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isUploading ? (
              <>
                <div className="animate-spin w-6 h-6 mr-3 border-2 border-white border-t-transparent rounded-full" />
                Przesyłanie...
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 mr-3" />
                Prześlij {selectedFiles.length} plik{selectedFiles.length > 1 ? 'ów' : ''}
              </>
            )}
          </Button>
          <div className="flex justify-between mt-2">
            <Button
              onClick={() => {
                setSelectedFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              variant="link"
              className="text-gray-500 hover:text-gray-700"
              disabled={isUploading}
            >
              Anuluj wybór
            </Button>
            <Button
              onClick={triggerFileInput}
              variant="link"
              className="text-yellow-600 hover:text-yellow-700"
              disabled={isUploading}
            >
              Dodaj więcej
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-sm mx-auto">
          <div 
            onClick={triggerFileInput}
            className="cursor-pointer border-2 border-dashed border-yellow-400 rounded-2xl p-8 bg-yellow-50 hover:bg-yellow-100 transition-colors duration-200 flex flex-col items-center justify-center text-yellow-700 hover:text-yellow-800 shadow-md hover:shadow-lg"
          >
            <Upload className="w-12 h-12 mb-4" />
            <p className="text-lg font-semibold mb-2">Dodaj zdjęcia i filmy</p>
            <p className="text-sm text-gray-600 mb-6">Możesz wybrać wiele plików jednocześnie</p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.capture = 'user';
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploading}
                variant="outline"
                className="border-yellow-600 text-yellow-700 hover:bg-stone-100 bg-white bg-opacity-90 py-3 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Camera className="w-5 h-5 mr-2" />
                Selfie
              </Button>
              
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.capture = 'environment';
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploading}
                variant="outline"
                className="border-yellow-600 text-yellow-700 hover:bg-stone-100 bg-white bg-opacity-90 py-3 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Image className="w-5 h-5 mr-2" />
                Aparat
              </Button>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-4">lub</p>
            
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (fileInputRef.current) {
                  fileInputRef.current.capture = '';
                  fileInputRef.current.click();
                }
              }}
              disabled={isUploading}
              variant="outline"
              className="mt-4 border-yellow-600 text-yellow-700 hover:bg-stone-100 bg-white bg-opacity-90 px-6 py-3 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full"
            >
              <Upload className="w-5 h-5 mr-2" />
              Wybierz z galerii
            </Button>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-3">
            Maksymalny rozmiar pliku: 100MB. Obsługiwane formaty: zdjęcia i filmy.
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
