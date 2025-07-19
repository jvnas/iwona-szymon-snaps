
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Photo {
  id: string;
  url: string;
  created_at: number;
  type: 'image' | 'video';
}

const Gallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const loadPhotos = async () => {
    setIsRefreshing(true);
    try {
      // Na produkcji pobieramy z prawdziwego API
      const response = await fetch('/api/photos');
      if (!response.ok) {
        throw new Error(`Failed to fetch photos: ${response.statusText}`);
      }
      const data: Photo[] = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadPhotos();
    const interval = setInterval(loadPhotos, 10000);
    return () => clearInterval(interval);
  }, []);

  const getItemCount = () => {
    const imageCount = photos.filter(p => p.type === 'image').length;
    const videoCount = photos.filter(p => p.type === 'video').length;
    
    if (imageCount === 0 && videoCount === 0) return '0 materiałów';
    if (imageCount === 0) return `${videoCount} ${videoCount === 1 ? 'film' : videoCount < 5 ? 'filmy' : 'filmów'}`;
    if (videoCount === 0) return `${imageCount} ${imageCount === 1 ? 'zdjęcie' : imageCount < 5 ? 'zdjęcia' : 'zdjęć'}`;
    
    return `${imageCount} ${imageCount === 1 ? 'zdjęcie' : imageCount < 5 ? 'zdjęcia' : 'zdjęć'} i ${videoCount} ${videoCount === 1 ? 'film' : videoCount < 5 ? 'filmy' : 'filmów'}`;
  };

  const openPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closePhoto = () => {
    setSelectedPhotoIndex(null);
  };

  const goToNextPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }
  };

  const goToPrevPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) { // Swiped left
      goToNextPhoto();
    } else if (touchEndX.current - touchStartX.current > 50) { // Swiped right
      goToPrevPhoto();
    }
  };

  const downloadPhoto = (photo: Photo) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `wspomnienie-${photo.created_at}.${photo.type === 'video' ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-gray-800">
                Miłość w każdym kadrze
              </h1>
              <p className="text-gray-600 mt-1">
                {getItemCount()}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={loadPhotos}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Odśwież
              </Button>
              <Link to="/">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Strona Główna
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-serif text-gray-700 mb-2">
              Jeszcze nie ma materiałów
            </h2>
            <p className="text-gray-600 mb-6">
              Bądź pierwszy i dodaj swoje wspomnienia z tego wyjątkowego dnia!
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300">
                Dodaj Pierwsze Zdjęcie lub Film
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-md relative cursor-pointer"
                onClick={() => openPhoto(index)}
              >
                {photo.type === 'video' ? (
                  <>
                    <video
                      src={photo.url}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      📹 Film
                    </div>
                  </>
                ) : (
                  <img
                    src={photo.url}
                    alt="Wspomnienie z wesela"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {/* Download button removed from grid item, moved to full-screen view */}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      {photos.length > 0 && (
        <Link to="/">
          <Button className="fixed bottom-6 right-6 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-full w-14 h-14 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110">
            <span className="text-2xl">+</span>
          </Button>
        </Link>
      )}

      {/* Full-screen Photo Viewer Modal */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
        >
          <Button 
            onClick={closePhoto} 
            className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-40 text-white rounded-full p-2 z-60 pointer-events-auto"
            size="icon"
          >
            <X className="w-6 h-6" />
          </Button>

          <Button 
            onClick={goToPrevPhoto} 
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white rounded-full p-2 pointer-events-auto z-51"
            size="icon"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button 
            onClick={goToNextPhoto} 
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white rounded-full p-2 pointer-events-auto z-51"
            size="icon"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            {photos[selectedPhotoIndex].type === 'video' ? (
              <video
                src={photos[selectedPhotoIndex].url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            ) : (
              <img
                src={photos[selectedPhotoIndex].url}
                alt="Pełnoekranowe wspomnienie"
                className="max-w-full max-h-full object-contain"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            )}
          </div>

          <Button 
            onClick={() => downloadPhoto(photos[selectedPhotoIndex])} 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white rounded-full p-2"
            size="icon"
          >
            <Download className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Gallery;
