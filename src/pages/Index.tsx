
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PhotoUpload from '@/components/PhotoUpload';
import { Heart, ArrowRight } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-yellow-50 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          
          {/* Header with Hearts */}
          <div className="flex items-center justify-center mb-6">
            <Heart className="w-8 h-8 text-yellow-600 mr-3 animate-pulse" />
            <h1 className="text-4xl md:text-6xl font-serif text-gray-800">
              Iwona & Szymon
            </h1>
            <Heart className="w-8 h-8 text-yellow-600 ml-3 animate-pulse" />
          </div>
          
          {/* Date */}
          <div className="text-yellow-700 font-medium text-lg mb-4">
            14 sierpnia 2025
          </div>
          
          {/* Subtitle */}
          <h2 className="text-xl md:text-2xl font-serif text-gray-700 mb-3 leading-relaxed">
            Nasze Wspomnienia
          </h2>
          
          <p className="text-gray-600 text-base md:text-lg mb-10 leading-relaxed max-w-xl mx-auto">
            Dziękujemy, że jesteście z nami! Pomóżcie nam stworzyć najpiękniejszy album. 
            Dodajcie swoje zdjęcia z dzisiejszego dnia.
          </p>
          
          {/* Upload Component */}
          <div className="mb-8">
            <PhotoUpload />
          </div>
          
          {/* Link to Gallery */}
          <Link to="/gallery">
            <Button 
              variant="outline" 
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-50 px-6 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105"
            >
              Zobacz Galerię
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-yellow-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-yellow-100 rounded-full opacity-30 animate-pulse delay-500"></div>
      </div>
      
      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>Z miłością dla naszych najbliższych 💕</p>
      </footer>
    </div>
  );
};

export default Index;
