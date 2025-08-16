import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { ExamWithBooklets, ExamSessionWithExam } from "@shared/schema";

interface ExamFormData {
  name: string;
  description: string;
  subject: string;
  durationMinutes: number;
  totalQuestions: number;
  answerKey: Record<string, string>;
}

export default function ExamAdmin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("exams");
  const [editingExam, setEditingExam] = useState<ExamWithBooklets | null>(null);
  const [examForm, setExamForm] = useState<ExamFormData>({
    name: "",
    description: "",
    subject: "",
    durationMinutes: 120,
    totalQuestions: 50,
    answerKey: {},
  });
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [selectedExamForUpload, setSelectedExamForUpload] = useState<string>("");
  const [selectedBookletType, setSelectedBookletType] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Check authorization
  const isAuthorized = isAuthenticated && (user as any)?.role === 'admin';

  console.log("ExamAdmin - isAuthorized:", isAuthorized);
  console.log("ExamAdmin - user:", user);

  const { data: exams = [] } = useQuery<ExamWithBooklets[]>({
    queryKey: ["exams-admin-list"],
    queryFn: async () => {
      const response = await fetch("/api/exams", { credentials: "include" });
      if (!response.ok) {
        console.error("Sınavlar yüklenemedi, ama panel açılsın");
        return []; // Hata olsa bile boş array döndür, panel açılsın
      }
      return response.json();
    },
    enabled: isAuthorized,
    onSuccess: (data) => console.log("Exams loaded:", data),
    onError: (error) => {
      console.error("Exams error:", error);
      // Hata olsa bile devam et
    },
  });

  const { data: allSessions = [] } = useQuery<ExamSessionWithExam[]>({
    queryKey: ["sessions-admin-list"],
    queryFn: async () => {
      const response = await fetch("/api/my-exam-sessions", { credentials: "include" });
      if (!response.ok) {
        console.error("Oturumlar yüklenemedi");
        return [];
      }
      return response.json();
    },
    enabled: isAuthorized,
    select: (data) => data.filter(session => session.status === 'completed'),
    onSuccess: (data) => console.log("Sessions loaded:", data),
    onError: (error) => {
      console.error("Sessions error:", error);
    },
  });

  const createExamMutation = useMutation({
    mutationFn: async (examData: any) => {
      return await apiRequest("POST", "/api/exams", examData);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sınav başarıyla oluşturuldu.",
      });
      queryClient.invalidateQueries({ queryKey: ["exams-admin-list"] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.message || "Sınav oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/exams/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sınav başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["exams-admin-list"] });
      setEditingExam(null);
      resetForm();
      setActiveTab("exams");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.message || "Sınav güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (examId: string) => {
      return await apiRequest("DELETE", `/api/exams/${examId}`);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sınav başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["exams-admin-list"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.message || "Sınav silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const uploadExcelMutation = useMutation({
    mutationFn: async ({ examId, bookletType, file }: { examId: string; bookletType: string; file: File }) => {
      const formData = new FormData();
      formData.append('excelFile', file);
      formData.append('bookletType', bookletType);
      
      const response = await fetch(`/api/exams/${examId}/upload-answer-key`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Excel dosyası yüklenirken hata oluştu');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Başarılı",
        description: `Cevap anahtarı başarıyla yüklendi. ${data.answerCount} soru, ${data.acquisitionCount} kazanım eklendi.`,
      });
      queryClient.invalidateQueries({ queryKey: ["exams-admin-list"] });
      setUploadFile(null);
      setSelectedExamForUpload("");
      setSelectedBookletType("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.message || "Excel dosyası yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setExamForm({
      name: "",
      description: "",
      subject: "",
      durationMinutes: 120,
      totalQuestions: 50,
      answerKey: {},
    });
    setAnswerKeyText("");
  };

  const parseAnswerKey = (text: string) => {
    const lines = text.trim().split('\n');
    const answerKey: Record<string, string> = {};
    
    lines.forEach(line => {
      const match = line.match(/^(\d+)[.)]\s*([ABCD])$/);
      if (match) {
        const [, questionNum, answer] = match;
        answerKey[questionNum] = answer;
      }
    });
    
    return answerKey;
  };

  const formatAnswerKey = (answerKey: Record<string, string>) => {
    return Object.entries(answerKey)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([q, a]) => `${q}. ${a}`)
      .join('\n');
  };

  const handleEditExam = (exam: ExamWithBooklets) => {
    setEditingExam(exam);
    setExamForm({
      name: exam.name,
      description: exam.description || "",
      subject: exam.subject,
      durationMinutes: exam.durationMinutes,
      totalQuestions: exam.totalQuestions,
      answerKey: exam.answerKey as Record<string, string>,
    });
    setAnswerKeyText(formatAnswerKey(exam.answerKey as Record<string, string>));
    setActiveTab("create");
  };

  const handleSubmit = () => {
    if (!examForm.name || !examForm.subject || !answerKeyText) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    const parsedAnswerKey = parseAnswerKey(answerKeyText);
    if (Object.keys(parsedAnswerKey).length === 0) {
      toast({
        title: "Cevap Anahtarı Hatası",
        description: "Cevap anahtarı formatı hatalı. Örnek: '1. A' şeklinde yazın.",
        variant: "destructive",
      });
      return;
    }

    const examData = {
      ...examForm,
      answerKey: parsedAnswerKey,
    };

    if (editingExam) {
      updateExamMutation.mutate({ id: editingExam.id, data: examData });
    } else {
      createExamMutation.mutate(examData);
    }
  };

  const handleFileUpload = () => {
    if (!selectedExamForUpload || !selectedBookletType || !uploadFile) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen sınav, kitapçık türü seçin ve Excel dosyası yükleyin.",
        variant: "destructive",
      });
      return;
    }

    uploadExcelMutation.mutate({
      examId: selectedExamForUpload,
      bookletType: selectedBookletType,
      file: uploadFile,
    });
  };

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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Yetkisiz Erişim</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Sınav admin paneline erişmek için yönetici hesabı gerekli.</p>
            <Button onClick={() => window.location.href = "/"} data-testid="button-home">
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjects = ["Matematik", "Türkçe", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-green-600">
        <div className="bg-green-600 text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <span className="font-medium">🎓 Sınav Sistemi Admin Paneli - Deneme Kapsülü</span>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
                <i className="fas fa-cogs mr-2"></i>
                Sınav Admin
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hoş geldin, {(user as any)?.firstName || (user as any)?.email}</span>
              <Button
                onClick={() => window.location.href = '/sinav'}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                data-testid="button-exam-site"
              >
                <i className="fas fa-graduation-cap mr-2"></i>
                Sınav Sitesi
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                data-testid="button-main-site"
              >
                <i className="fas fa-store mr-2"></i>
                Ana Site
              </Button>
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

      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Sınav</CardTitle>
              <i className="fas fa-clipboard-list text-green-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-exams">{exams.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Katılım</CardTitle>
              <i className="fas fa-users text-green-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-sessions">{allSessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Başarı</CardTitle>
              <i className="fas fa-chart-line text-green-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-average-success">
                {allSessions.length > 0 
                  ? (allSessions.reduce((sum, s) => sum + parseFloat(s.percentage || "0"), 0) / allSessions.length).toFixed(1)
                  : 0
                }%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Sınavlar</CardTitle>
              <i className="fas fa-play text-green-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-exams">
                {exams.filter(exam => exam.isActive).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="exams" data-testid="tab-manage-exams">
              <i className="fas fa-list mr-2"></i>
              Sınav Listesi
            </TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create-exam">
              <i className="fas fa-plus mr-2"></i>
              {editingExam ? "Sınav Düzenle" : "Yeni Sınav"}
            </TabsTrigger>
            <TabsTrigger value="upload-excel" data-testid="tab-upload-excel">
              <i className="fas fa-file-excel mr-2"></i>
              Excel Yükle
            </TabsTrigger>
            <TabsTrigger value="statistics" data-testid="tab-statistics">
              <i className="fas fa-chart-bar mr-2"></i>
              İstatistikler
            </TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">
              <i className="fas fa-clock mr-2"></i>
              Oturumlar
            </TabsTrigger>
          </TabsList>

          {/* Exam List */}
          <TabsContent value="exams">
            <Card>
              <CardHeader>
                <CardTitle>Sınav Yönetimi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exams.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                      <p>Henüz sınav oluşturulmamış.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {exams.map((exam) => (
                        <Card key={exam.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold">{exam.name}</h3>
                                <Badge className="bg-green-100 text-green-800">{exam.subject}</Badge>
                                <Badge variant={exam.isActive ? "default" : "secondary"}>
                                  {exam.isActive ? "Aktif" : "Pasif"}
                                </Badge>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{exam.description}</p>
                              <div className="flex space-x-4 text-sm text-gray-600">
                                <span>{exam.totalQuestions} soru</span>
                                <span>{exam.durationMinutes} dakika</span>
                                <span>{exam.booklets.length} kitapçık türü</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditExam(exam)}
                                data-testid={`button-edit-exam-${exam.id}`}
                              >
                                <i className="fas fa-edit mr-1"></i>
                                Düzenle
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                    data-testid={`button-delete-exam-${exam.id}`}
                                  >
                                    <i className="fas fa-trash mr-1"></i>
                                    Sil
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Sınavı Silmek İstiyor musunuz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Bu işlem geri alınamaz. &quot;{exam.name}&quot; sınavı kalıcı olarak silinecek.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteExamMutation.mutate(exam.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Evet, Sil
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create/Edit Exam */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>{editingExam ? `Sınav Düzenle: ${editingExam.name}` : "Yeni Sınav Oluştur"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Sınav Adı *</Label>
                    <Input
                      id="name"
                      value={examForm.name}
                      onChange={(e) => setExamForm({...examForm, name: e.target.value})}
                      placeholder="Örnek: LGS Matematik Denemesi"
                      data-testid="input-exam-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Ders *</Label>
                    <Select value={examForm.subject} onValueChange={(value) => setExamForm({...examForm, subject: value})}>
                      <SelectTrigger data-testid="select-subject">
                        <SelectValue placeholder="Ders seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Süre (Dakika) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={examForm.durationMinutes}
                      onChange={(e) => setExamForm({...examForm, durationMinutes: parseInt(e.target.value) || 0})}
                      placeholder="120"
                      data-testid="input-duration"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="questions">Soru Sayısı *</Label>
                    <Input
                      id="questions"
                      type="number"
                      value={examForm.totalQuestions}
                      onChange={(e) => setExamForm({...examForm, totalQuestions: parseInt(e.target.value) || 0})}
                      placeholder="50"
                      data-testid="input-questions"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={examForm.description}
                    onChange={(e) => setExamForm({...examForm, description: e.target.value})}
                    placeholder="Sınav hakkında açıklama..."
                    className="min-h-[100px]"
                    data-testid="textarea-description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="answerKey">Cevap Anahtarı *</Label>
                  <Textarea
                    id="answerKey"
                    value={answerKeyText}
                    onChange={(e) => setAnswerKeyText(e.target.value)}
                    placeholder="1. A&#10;2. B&#10;3. C&#10;4. D&#10;..."
                    className="min-h-[200px] font-mono"
                    data-testid="textarea-answer-key"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: Her satıra bir cevap, &quot;1. A&quot; şeklinde yazın
                  </p>
                </div>
                
                <div className="flex justify-between">
                  {editingExam && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingExam(null);
                        resetForm();
                        setActiveTab("exams");
                      }}
                      data-testid="button-cancel-edit"
                    >
                      İptal
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={createExamMutation.isPending || updateExamMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 ml-auto"
                    data-testid="button-save-exam"
                  >
                    {createExamMutation.isPending || updateExamMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        {editingExam ? "Güncelleniyor..." : "Oluşturuluyor..."}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        {editingExam ? "Güncelle" : "Oluştur"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Excel Answer Key */}
          <TabsContent value="upload-excel">
            <Card>
              <CardHeader>
                <CardTitle>Excel ile Yeni Sınav Oluştur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Excel Dosya Formatı:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Sütunlar örneği: <strong>Kitapçık</strong>, <strong>Deneme Adı</strong>, <strong>Ders</strong>, <strong>Soru No</strong>, …, <strong>Cevap</strong>, <strong>Kazanım</strong></li>
                    <li>• Cevaplar: A, B, C, D, E desteklenir</li>
                    <li>• İlk satır başlıktır</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="new-exam-name">Sınav Adı *</Label>
                    <Input id="new-exam-name" value={examForm.name} onChange={(e)=>setExamForm({...examForm, name: e.target.value})} placeholder="Örnek: TYT Türkçe Denemesi" />
                  </div>
                  <div>
                    <Label htmlFor="duration">Süre (Dakika) *</Label>
                    <Input id="duration" type="number" value={examForm.durationMinutes} onChange={(e)=>setExamForm({...examForm, durationMinutes: parseInt(e.target.value)||0})} placeholder="120" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="excel-file">Excel Dosyası *</Label>
                  <Input id="excel-file" type="file" accept=".xlsx,.xls" onChange={(e)=>setUploadFile(e.target.files?.[0]||null)} className="cursor-pointer" data-testid="input-excel-file" />
                  {uploadFile && <p className="text-sm text-gray-600 mt-1">Seçilen dosya: {uploadFile.name}</p>}
                </div>

                <Button onClick={()=>{
                  if (!examForm.name || !examForm.durationMinutes || !uploadFile) {
                    toast({ title: "Eksik Bilgi", description: "Sınav adı, süre ve Excel dosyası zorunludur.", variant: "destructive" });
                    return;
                  }
                  const formData = new FormData();
                  formData.append('excelFile', uploadFile);
                  formData.append('name', examForm.name);
                  formData.append('durationMinutes', String(examForm.durationMinutes));
                  fetch('/api/exams/upload', { method: 'POST', body: formData, credentials: 'include' })
                    .then(async (r)=>{ if(!r.ok){ const e=await r.json().catch(()=>({message:'Hata'})); throw new Error(e.message||'Hata'); } return r.json(); })
                    .then((data)=>{
                      toast({ title: 'Başarılı', description: `Sınav oluşturuldu. Soru sayısı: ${data.totalQuestions}` });
                      queryClient.invalidateQueries({ queryKey: ['exams-admin-list'] });
                      setUploadFile(null);
                      resetForm();
                    })
                    .catch((e)=> toast({ title: 'Hata', description: e.message, variant: 'destructive' }));
                }} disabled={uploadExcelMutation.isPending} className="bg-green-600 hover:bg-green-700 w-full" data-testid="button-upload-excel">
                  <i className="fas fa-upload mr-2"></i>
                  Excel'den Sınav Oluştur
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="statistics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ders Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {subjects.map((subject) => {
                      const subjectExams = exams.filter(exam => exam.subject === subject);
                      const percentage = exams.length > 0 ? (subjectExams.length / exams.length) * 100 : 0;
                      
                      return subjectExams.length > 0 && (
                        <div key={subject} className="flex justify-between items-center">
                          <span className="text-sm">{subject}:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{subjectExams.length}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performans Özeti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>En Yüksek Puan:</span>
                      <span className="font-bold text-green-600">
                        {allSessions.length > 0 
                          ? Math.max(...allSessions.map(s => parseFloat(s.percentage || "0"))).toFixed(1)
                          : 0
                        }%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>En Düşük Puan:</span>
                      <span className="font-bold text-red-600">
                        {allSessions.length > 0 
                          ? Math.min(...allSessions.map(s => parseFloat(s.percentage || "0"))).toFixed(1)
                          : 0
                        }%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Ortalama Puan:</span>
                      <span className="font-bold">
                        {allSessions.length > 0 
                          ? (allSessions.reduce((sum, s) => sum + parseFloat(s.percentage || "0"), 0) / allSessions.length).toFixed(1)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sessions */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Sınav Oturumları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-clock text-4xl mb-4"></i>
                      <p>Henüz tamamlanan sınav oturumu bulunmuyor.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allSessions.slice(0, 10).map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{session.exam.name}</div>
                            <div className="text-sm text-gray-600">
                              {session.exam.subject} • Kitapçık {session.bookletType} • 
                              {new Date(session.completedAt!).toLocaleDateString("tr-TR")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {parseFloat(session.percentage || "0").toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">
                              {session.score} / {session.exam.totalQuestions}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}