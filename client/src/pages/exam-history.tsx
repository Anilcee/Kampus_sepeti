import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExamSessionWithExam } from "@shared/schema";

export default function ExamHistory() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: sessions = [], isLoading } = useQuery<ExamSessionWithExam[]>({
    queryKey: ["/api/my-exam-sessions"],
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
            <p className="text-gray-600 mb-4">Sınav geçmişinizi görmek için giriş yapmanız gerekiyor.</p>
            <Link href="/login">
              <Button data-testid="button-login">Giriş Yap</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedSessions = sessions.filter(s => s.status === "completed");
  const inProgressSessions = sessions.filter(s => s.status === "started");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>;
      case "started":
        return <Badge className="bg-blue-100 text-blue-800">Devam Ediyor</Badge>;
      case "abandoned":
        return <Badge className="bg-red-100 text-red-800">Yarıda Bırakıldı</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 85) return "text-green-600";
    if (percentage >= 75) return "text-blue-600";
    if (percentage >= 65) return "text-indigo-600";
    if (percentage >= 55) return "text-yellow-600";
    if (percentage >= 45) return "text-orange-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR");
  };

  const averageScore = completedSessions.length > 0 
    ? completedSessions.reduce((sum, session) => sum + parseFloat(session.percentage || "0"), 0) / completedSessions.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-green-600">
        <div className="bg-green-600 text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <span className="font-medium">📊 Sınav Geçmişim - Deneme Kapsülü</span>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/sinav">
                <Button variant="outline" data-testid="button-back-to-exams">
                  <i className="fas fa-arrow-left mr-2"></i>
                  Sınavlara Dön
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hoş geldin, {(user as any)?.firstName || (user as any)?.email}</span>
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            <i className="fas fa-history mr-3"></i>
            Sınav Geçmişim
          </h1>
          <p className="text-gray-600">Geçmiş sınavlarınızın detayları ve performans istatistikleri</p>
        </div>

        {/* İstatistik Özeti */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg text-blue-600">Toplam Sınav</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-blue-600" data-testid="text-total-exams">
                {sessions.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg text-green-600">Tamamlanan</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600" data-testid="text-completed-exams">
                {completedSessions.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg text-yellow-600">Devam Eden</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-yellow-600" data-testid="text-ongoing-exams">
                {inProgressSessions.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg text-purple-600">Ortalama</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-purple-600" data-testid="text-average-score">
                {averageScore.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Devam Eden Sınavlar */}
        {inProgressSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Devam Eden Sınavlar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressSessions.map((session) => (
                <Card key={session.id} className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{session.exam.name}</CardTitle>
                      {getStatusBadge(session.status)}
                    </div>
                    <Badge variant="outline">{session.exam.subject}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kitapçık:</span>
                        <span className="font-medium">{session.bookletType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Başlangıç:</span>
                        <span className="font-medium">{formatDate(session.startedAt!)}</span>
                      </div>
                    </div>
                    <Link href={`/sinav/${session.examId}/oturum/${session.id}`}>
                      <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" data-testid={`button-continue-exam-${session.id}`}>
                        <i className="fas fa-play mr-2"></i>
                        Devam Et
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Sınav Geçmişi */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tamamlanan Sınavlar</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : completedSessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <i className="fas fa-clipboard-list text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz Tamamlanan Sınav Yok</h3>
                <p className="text-gray-600 mb-4">İlk sınavınızı tamamladığınızda burada görünecek.</p>
                <Link href="/sinav">
                  <Button className="bg-green-600 hover:bg-green-700" data-testid="button-first-exam">
                    <i className="fas fa-plus mr-2"></i>
                    İlk Sınavımı Başlat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedSessions.map((session) => {
                const percentage = parseFloat(session.percentage || "0");
                return (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">{session.exam.name}</h3>
                            <Badge variant="outline">{session.exam.subject}</Badge>
                            <Badge variant="outline">Kitapçık {session.bookletType}</Badge>
                            {getStatusBadge(session.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Doğru:</span>
                              <span className="font-medium ml-1 text-green-600">{session.score || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Tamamlanma:</span>
                              <span className="font-medium ml-1">{formatDate(session.completedAt!)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Süre:</span>
                              <span className="font-medium ml-1">{session.exam.durationMinutes} dk</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Soru:</span>
                              <span className="font-medium ml-1">{session.exam.totalQuestions}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-6">
                          <div className={`text-3xl font-bold ${getGradeColor(percentage)}`}>
                            {percentage.toFixed(1)}%
                          </div>
                          <Link href={`/sinav/sonuclar/${session.id}`}>
                            <Button size="sm" variant="outline" className="mt-2" data-testid={`button-view-result-${session.id}`}>
                              <i className="fas fa-eye mr-1"></i>
                              Detay
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {completedSessions.length > 0 && (
          <div className="text-center mt-8">
            <Link href="/sinav">
              <Button className="bg-green-600 hover:bg-green-700" data-testid="button-new-exam">
                <i className="fas fa-plus mr-2"></i>
                Yeni Sınav Başlat
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}