
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface Photo {
  id: string;
  url: string;
  timestamp: number;
  type: 'image' | 'video';
}

interface PhotoUploadProps {
  onUploadSuccess: () => void;
}

const PhotoUpload = ({ onUploadSuccess }: PhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uploadSuccess) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [uploadSuccess]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const existingPhotos = localStorage.getItem('wedding-photos');
      const photos: Photo[] = existingPhotos ? JSON.parse(existingPhotos) : [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
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
      onUploadSuccess();

    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAddMore = () => {
    setUploadSuccess(false);
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
        onChange={handlePhotoUpload}
        className="hidden"
        
      />
      
      <Button
        onClick={triggerFileInput}
        disabled={isUploading}
        variant="outline"
        className="border-yellow-600 text-yellow-700 hover:bg-stone-100 bg-white bg-opacity-90 px-12 py-6 text-lg font-medium rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
      
    </div>
  );
};

export default PhotoUpload;
