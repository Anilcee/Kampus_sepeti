import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-primary">
        <div className="bg-primary text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <span className="font-medium">9.000 TL Üstüne Peşin Fiyatına 6 Taksit Avantajını Kaçırmayın!</span>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xl">
                <i className="fas fa-graduation-cap mr-2"></i>
                Kampüs Sepeti
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => window.location.href = '/api/login'}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white"
                data-testid="button-login"
              >
                <i className="fas fa-user mr-2"></i>
                Giriş Yap
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
            Kampüs Sepeti'ne Hoş Geldiniz
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Türkiye'nin en güvenilir deneme kitabı ve eğitim materyalleri platformu. 
            5. sınıftan üniversite sınavlarına kadar tüm eğitim seviyelerine uygun deneme kitapları.
          </p>
          <Button
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-primary hover:bg-blue-700 text-white px-8 py-4 text-lg"
            data-testid="button-get-started"
          >
            <i className="fas fa-graduation-cap mr-2"></i>
            Hemen Başla
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-book text-2xl"></i>
              </div>
              <CardTitle>Geniş Ürün Yelpazesi</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                5. sınıftan YKS'ye kadar her seviyede kaliteli deneme kitapları ve eğitim materyalleri
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-2xl"></i>
              </div>
              <CardTitle>Uzman Koçluk</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Seçili ürünlerde uzman öğretmenlerden kişisel koçluk desteği alın
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-shipping-fast text-2xl"></i>
              </div>
              <CardTitle>Hızlı Teslimat</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Siparişleriniz en kısa sürede güvenli bir şekilde elinizde
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Categories Preview */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Kategorilerimiz</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "5. Sınıf", icon: "fas fa-child" },
              { name: "6. Sınıf", icon: "fas fa-graduation-cap" },
              { name: "7. Sınıf", icon: "fas fa-user-graduate" },
              { name: "LGS", icon: "fas fa-certificate" },
              { name: "YKS", icon: "fas fa-university" },
              { name: "DGS", icon: "fas fa-book-open" },
              { name: "KPSS", icon: "fas fa-briefcase" },
              { name: "ALES", icon: "fas fa-award" },
            ].map((category) => (
              <div key={category.name} className="text-center p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <i className={`${category.icon} text-lg`}></i>
                </div>
                <h3 className="font-medium text-gray-800">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-primary text-white px-3 py-1 rounded font-bold">
                <i className="fas fa-graduation-cap mr-1"></i>
                Kampüs Sepeti
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              &copy; 2024 Kampüs Sepeti. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
