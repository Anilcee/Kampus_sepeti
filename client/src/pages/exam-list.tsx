import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExamWithBooklets } from "@shared/schema";

export default function ExamList() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: exams = [], isLoading } = useQuery<ExamWithBooklets[]>({
    queryKey: ["/api/exams"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Giriş Gerekli</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Sınavlara erişmek için giriş yapmanız gerekiyor.</p>
            <Link href="/login">
              <Button data-testid="button-login">Giriş Yap</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-green-600">
        <div className="bg-green-600 text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <span className="font-medium">🎯 Online Sınav Sistemi - Deneme Kapsülü</span>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <div className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xl cursor-pointer">
                  <i className="fas fa-graduation-cap mr-2"></i>
                  Sınav Sistemi
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hoş geldin, {(user as any)?.firstName || (user as any)?.email}</span>
              <Link href="/sinav/gecmis">
                <Button variant="outline" data-testid="button-exam-history">
                  <i className="fas fa-history mr-2"></i>
                  Sınav Geçmişim
                </Button>
              </Link>
              <Button
                onClick={() => window.location.href = '/api/logout'}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Aktif Sınavlar</h1>
          <p className="text-gray-600">Aşağıdaki sınavlara katılabilirsiniz</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-lg mx-auto">
              <i className="fas fa-shopping-cart text-4xl text-blue-400 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz Deneme Paketi Satın Almadınız</h3>
              <p className="text-gray-600 mb-6">
                Sınavlara katılabilmek için önce deneme paketlerinden birini satın almanız gerekiyor.
              </p>
              <div className="space-y-3">
                <Link href="/">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
                    <i className="fas fa-shopping-bag mr-2"></i>
                    Deneme Paketlerine Göz At
                  </Button>
                </Link>
                <div className="text-sm text-gray-500">
                  Paket satın aldıktan sonra sınavlar burada görünecektir.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-gray-800">{exam.name}</CardTitle>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {exam.subject}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">{exam.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Soru Sayısı:</span>
                      <span className="font-medium">{exam.totalQuestions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Süre:</span>
                      <span className="font-medium">{exam.durationMinutes} dakika</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Kitapçık Türleri:</span>
                      <div className="space-x-1">
                        {exam.booklets.map((booklet) => (
                          <Badge key={booklet.id} variant="outline" className="text-xs">
                            {booklet.bookletCode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Link href={`/sinav/${exam.id}`}>
                      <Button 
                        className="w-full mt-4 bg-green-600 hover:bg-green-700" 
                        data-testid={`button-start-exam-${exam.id}`}
                      >
                        <i className="fas fa-play mr-2"></i>
                        Sınava Başla
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-green-600 text-white px-3 py-1 rounded font-bold">
                <i className="fas fa-graduation-cap mr-1"></i>
                Deneme Kapsülü - Sınav Sistemi
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Güvenli ve modern online sınav platformu
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}