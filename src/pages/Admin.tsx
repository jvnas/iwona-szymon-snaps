
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Photo {
  id: string;
  url: string;
  created_at: number;
  type: 'image' | 'video';
}

const Admin = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPhotos = async () => {
    try {
      const response = await fetch('/api/photos');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Photo[] = await response.json();
      setPhotos(data.sort((a, b) => b.created_at - a.created_at));
    } catch (error) {
      console.error("Failed to fetch photos:", error);
      // Optionally, show a toast notification here
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPhotos();
    }
  }, [isAuthenticated]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Nieprawidłowe hasło');
    }
    setPassword('');
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      const response = await fetch(`/api/photos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== id));
      toast({
        title: "Sukces",
        description: "Zdjęcie zostało pomyślnie usunięte.",
      });
    } catch (error) {
      console.error("Failed to delete photo:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć zdjęcia.",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 mx-auto text-gray-400" />
            <h2 className="text-2xl font-serif text-gray-800 mt-4">
              Panel Administratora
            </h2>
            <p className="text-gray-600 mt-2">
              Wymagane jest hasło, aby zarządzać galerią.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Wprowadź hasło"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <Button type="submit" className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-white">
              Zaloguj się
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-serif text-gray-800 mb-6">
        Zarządzanie Galerią
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square bg-gray-200 rounded-lg overflow-hidden">
            {photo.type === 'video' ? (
              <video
                src={photo.url}
                className="w-full h-full object-cover"
                controls
                preload="metadata"
              />
            ) : (
              <img
                src={photo.url}
                alt="Wspomnienie z wesela"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Usuń
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tej akcji nie można cofnąć. Spowoduje to trwałe usunięcie pliku.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeletePhoto(photo.id)}>
                      Tak, usuń
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
