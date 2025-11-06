import { useParams, useNavigate } from "react-router-dom";
import { useBlogPost } from "@/hooks/useBlogPost";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading } = useBlogPost(slug || "");

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate("/blog")}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            {isLoading ? (
              <div>
                <Skeleton className="h-12 w-3/4 mb-4" />
                <Skeleton className="h-6 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full mb-8" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : post ? (
              <article>
                <header className="mb-8">
                  <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      {post.published_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(post.published_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                      {post.blog_categories && (
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {post.blog_categories.name}
                        </span>
                      )}
                    </div>
                    {post.profiles && (
                      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={post.profiles.avatar_url || ""} />
                          <AvatarFallback>
                            {post.profiles.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {post.profiles.full_name}
                          </span>
                          {post.profiles.job_title && (
                            <span className="text-sm text-muted-foreground">
                              {post.profiles.job_title}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </header>

                {post.featured_image && (
                  <div className="mb-8 rounded-lg overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-auto"
                    />
                  </div>
                )}

                <div
                  className="prose prose-lg max-w-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4 [&_li]:my-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-8 [&_a]:text-primary [&_a]:underline [&_.video-wrapper]:my-8"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </article>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Post não encontrado</p>
              </div>
            )}
          </div>
    </div>
  );
}
