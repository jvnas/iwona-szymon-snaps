
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Photo {
  id: string;
  url: string;
  timestamp: number;
}

const Gallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPhotos = () => {
    setIsRefreshing(true);
    // Symulacja ładowania zdjęć z localStorage
    const savedPhotos = localStorage.getItem('wedding-photos');
    if (savedPhotos) {
      const parsedPhotos = JSON.parse(savedPhotos);
      // Sortowanie od najnowszych do najstarszych
      setPhotos(parsedPhotos.sort((a: Photo, b: Photo) => b.timestamp - a.timestamp));
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    loadPhotos();
    // Auto-refresh co 10 sekund
    const interval = setInterval(loadPhotos, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-gray-800">
                Nasze Wspomnienia
              </h1>
              <p className="text-gray-600 mt-1">
                {photos.length} {photos.length === 1 ? 'zdjęcie' : photos.length < 5 ? 'zdjęcia' : 'zdjęć'}
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
              Jeszcze nie ma zdjęć
            </h2>
            <p className="text-gray-600 mb-6">
              Bądź pierwszy i dodaj swoje wspomnienia z tego wyjątkowego dnia!
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300">
                Dodaj Pierwsze Zdjęcie
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <img
                  src={photo.url}
                  alt="Wspomnienie z wesela"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
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
    </div>
  );
};

export default Gallery;
