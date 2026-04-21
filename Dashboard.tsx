import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Plus, FileText, Clock, CheckCircle, Archive, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: projects, isLoading: projectsLoading } = trpc.project.list.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      draft: { variant: "outline", icon: FileText },
      analyzing: { variant: "default", icon: Clock },
      completed: { variant: "secondary", icon: CheckCircle },
      archived: { variant: "destructive", icon: Archive },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status === "draft" && "草稿"}
        {status === "analyzing" && "分析中"}
        {status === "completed" && "已完成"}
        {status === "archived" && "已归档"}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Global Aging Data to Lancet</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name || user.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">我的研究项目</h2>
            <p className="text-gray-600 mt-1">管理您的流行病学研究分析项目</p>
          </div>
          <Button onClick={() => setLocation("/project/new")} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            新建项目
          </Button>
        </div>

        {projectsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/project/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                    {getStatusBadge(project.status)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {project.description || "暂无描述"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">
                    创建于 {new Date(project.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">还没有项目</h3>
              <p className="text-gray-600 mb-6">创建您的第一个研究项目，开始自动化分析之旅</p>
              <Button onClick={() => setLocation("/project/new")}>
                <Plus className="h-5 w-5 mr-2" />
                创建项目
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
