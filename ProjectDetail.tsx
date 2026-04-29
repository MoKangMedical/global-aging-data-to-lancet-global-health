import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Loader2, FileText, BarChart3, FileImage, BookOpen } from "lucide-react";
import { toast } from "sonner";
import FileUploader from "@/components/FileUploader";

export default function ProjectDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const projectId = parseInt(params.id || "0");

  const { data: projectDetails, isLoading } = trpc.project.getDetails.useQuery(
    { projectId },
    { enabled: !!user && projectId > 0 }
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!projectDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">项目未找到</h2>
          <Button onClick={() => setLocation("/dashboard")}>返回仪表板</Button>
        </div>
      </div>
    );
  }

  const { project, files, picoAnalysis, analyses, tables, figures, manuscript, citations } = projectDetails;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回仪表板
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
          <p className="text-gray-600 mt-2">{project.description}</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="files">文件上传</TabsTrigger>
            <TabsTrigger value="pico">PICO分析</TabsTrigger>
            <TabsTrigger value="analysis">统计分析</TabsTrigger>
            <TabsTrigger value="output">表格图形</TabsTrigger>
            <TabsTrigger value="manuscript">论文</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">上传文件</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{files.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">统计分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyses.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">表格图形</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tables.length + figures.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">文献引用</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{citations.length}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>项目进度</CardTitle>
                <CardDescription>完成以下步骤以生成完整的研究报告</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${files.length > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {files.length > 0 ? "✓" : "1"}
                  </div>
                  <div>
                    <div className="font-medium">上传研究方案</div>
                    <div className="text-sm text-gray-600">上传PDF或Word文档</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${picoAnalysis ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {picoAnalysis ? "✓" : "2"}
                  </div>
                  <div>
                    <div className="font-medium">PICO分析</div>
                    <div className="text-sm text-gray-600">自动解析研究框架</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analyses.length > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {analyses.length > 0 ? "✓" : "3"}
                  </div>
                  <div>
                    <div className="font-medium">统计分析</div>
                    <div className="text-sm text-gray-600">执行生存分析或回归模型</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${manuscript ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {manuscript ? "✓" : "4"}
                  </div>
                  <div>
                    <div className="font-medium">生成论文</div>
                    <div className="text-sm text-gray-600">自动撰写学术论文</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>文件管理</CardTitle>
                <CardDescription>上传和管理研究方案文档</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader projectId={projectId} onUploadSuccess={() => {
                  toast.success("文件上传成功");
                  // Refresh project details
                  window.location.reload();
                }} />

                {files.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h4 className="font-medium mb-2">已上传文件</h4>
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium">{file.fileName}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(file.uploadedAt).toLocaleString("zh-CN")}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          分析
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pico">
            <Card>
              <CardHeader>
                <CardTitle>PICO/PECO分析结果</CardTitle>
                <CardDescription>自动提取的研究框架要素</CardDescription>
              </CardHeader>
              <CardContent>
                {picoAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <div className="font-semibold text-sm text-gray-600 mb-1">Population (人群)</div>
                      <div className="p-3 bg-gray-50 rounded">{picoAnalysis.population}</div>
                    </div>
                    {picoAnalysis.intervention && (
                      <div>
                        <div className="font-semibold text-sm text-gray-600 mb-1">Intervention (干预)</div>
                        <div className="p-3 bg-gray-50 rounded">{picoAnalysis.intervention}</div>
                      </div>
                    )}
                    {picoAnalysis.comparison && (
                      <div>
                        <div className="font-semibold text-sm text-gray-600 mb-1">Comparison (对照)</div>
                        <div className="p-3 bg-gray-50 rounded">{picoAnalysis.comparison}</div>
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-gray-600 mb-1">Outcome (结局)</div>
                      <div className="p-3 bg-gray-50 rounded">{picoAnalysis.outcome}</div>
                    </div>
                    {picoAnalysis.exposure && (
                      <div>
                        <div className="font-semibold text-sm text-gray-600 mb-1">Exposure (暴露)</div>
                        <div className="p-3 bg-gray-50 rounded">{picoAnalysis.exposure}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>尚未进行PICO分析</p>
                    <p className="text-sm mt-1">请先上传研究方案文档</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>统计分析</CardTitle>
                <CardDescription>执行生存分析和回归模型</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>统计分析功能正在开发中</p>
                  <p className="text-sm mt-1">即将支持数据上传和分析配置</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="output">
            <Card>
              <CardHeader>
                <CardTitle>表格和图形</CardTitle>
                <CardDescription>Lancet标准格式的学术输出</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileImage className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无生成的表格和图形</p>
                  <p className="text-sm mt-1">完成统计分析后自动生成</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manuscript">
            <Card>
              <CardHeader>
                <CardTitle>论文草稿</CardTitle>
                <CardDescription>自动生成的学术论文</CardDescription>
              </CardHeader>
              <CardContent>
                {manuscript ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-lg mb-2">摘要</h3>
                      <div className="prose max-w-none">{manuscript.abstract}</div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">引言</h3>
                      <div className="prose max-w-none">{manuscript.introduction}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>暂无论文草稿</p>
                    <p className="text-sm mt-1">完成所有分析步骤后生成论文</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
