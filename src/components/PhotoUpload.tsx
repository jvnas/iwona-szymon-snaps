
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Check } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  timestamp: number;
  type: 'image' | 'video';
}

const PhotoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const existingPhotos = localStorage.getItem('wedding-photos');
      const photos: Photo[] = existingPhotos ? JSON.parse(existingPhotos) : [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Konwersja na base64 dla prostoty (w prawdziwej aplikacji użyłbyś storage cloud)
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = () => {
            const newPhoto: Photo = {
              id: Date.now().toString() + i,
              url: reader.result as string,
              timestamp: Date.now(),
              type: file.type.startsWith('video/') ? 'video' : 'image'
            };
            photos.push(newPhoto);
            resolve(true);
          };
          reader.readAsDataURL(file);
        });
      }

      localStorage.setItem('wedding-photos', JSON.stringify(photos));
      
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (uploadSuccess) {
    return (
      <div className="text-center py-8 px-6 bg-white rounded-2xl shadow-xl border border-green-100">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-serif text-gray-800 mb-2">
          Dziękujemy!
        </h3>
        <p className="text-gray-600 mb-4">
          Twoje zdjęcia i filmy zostały dodane do galerii
        </p>
        <div className="text-sm text-gray-500">
          Możesz dodać więcej materiałów lub przejść do galerii
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
        onChange={handlePhotoUpload}
        className="hidden"
        capture="environment"
      />
      
      <Button
        onClick={triggerFileInput}
        disabled={isUploading}
        className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-12 py-6 text-lg font-medium rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <div className="animate-spin w-6 h-6 mr-3 border-2 border-white border-t-transparent rounded-full" />
            Dodawanie...
          </>
        ) : (
          <>
            <Camera className="w-6 h-6 mr-3" />
            Dodaj Zdjęcia i Filmy
          </>
        )}
      </Button>
      
      <p className="text-gray-600 mt-4 text-sm max-w-sm mx-auto">
        Możesz wybrać zdjęcia i filmy naraz. Bez rejestracji, bez logowania.
      </p>
    </div>
  );
};

export default PhotoUpload;
