import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetVideoInfo, getGetVideoInfoQueryKey, useCreateDownload } from '@workspace/api-client-react';
import { useJobProgress } from '@/hooks/use-job-progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Download, Music, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  format: z.enum(['mp3', 'm4a']).default('mp3'),
});

type FormValues = z.infer<typeof formSchema>;

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function VideoItem({ url, format }: { url: string; format: 'mp3' | 'm4a' }) {
  const { data: videoInfo, isLoading, isError, error } = useGetVideoInfo(
    { url },
    { query: { enabled: !!url, queryKey: getGetVideoInfoQueryKey({ url }), retry: false } }
  );

  const [jobId, setJobId] = useState<string | null>(null);
  const createDownload = useCreateDownload();
  const progress = useJobProgress(jobId);

  const handleDownload = () => {
    createDownload.mutate(
      { data: { url, format } },
      {
        onSuccess: (data) => {
          setJobId(data.jobId);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card overflow-hidden">
        <CardContent className="p-0 flex flex-col sm:flex-row h-full">
          <Skeleton className="w-full sm:w-48 h-32 rounded-none" />
          <div className="p-4 flex flex-col justify-between flex-1 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to fetch info for {url}. {error?.error || 'Invalid URL or private video.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!videoInfo) return null;

  return (
    <Card className="border-border/50 bg-card overflow-hidden transition-all duration-300">
      <CardContent className="p-0 flex flex-col sm:flex-row h-full group">
        <div className="relative w-full sm:w-48 h-32 shrink-0 bg-muted">
          <img src={videoInfo.thumbnail} alt={videoInfo.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs font-mono text-white">
            {formatDuration(videoInfo.duration)}
          </div>
        </div>
        
        <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <h3 className="font-medium text-foreground truncate" title={videoInfo.title}>
              {videoInfo.title}
            </h3>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground font-mono">
              {videoInfo.filesize && <span>{formatBytes(videoInfo.filesize)}</span>}
              {videoInfo.bitrate && <span>{Math.round(videoInfo.bitrate)} kbps</span>}
              <span className="uppercase">{format}</span>
            </div>
          </div>

          <div className="mt-4">
            {!jobId ? (
              <Button 
                onClick={handleDownload} 
                disabled={createDownload.isPending}
                className="w-full sm:w-auto text-primary-foreground font-medium"
              >
                {createDownload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download
              </Button>
            ) : (
              <div className="space-y-3">
                {progress.status === 'error' ? (
                  <Alert variant="destructive" className="py-2 px-3 bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertDescription className="text-sm font-mono">{progress.error || 'Download failed'}</AlertDescription>
                  </Alert>
                ) : progress.status === 'done' ? (
                  <Button asChild className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-black">
                    <a href={`/api/downloads/${jobId}/file`} download>
                      <Download className="mr-2 h-4 w-4" /> Save File
                    </a>
                  </Button>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground capitalize">
                      <span>{progress.status}</span>
                      {progress.progress > 0 && <span>{Math.round(progress.progress)}%</span>}
                    </div>
                    <Progress value={progress.progress || 0} className="h-2 rounded bg-muted" indicatorClassName={progress.status === 'done' ? 'bg-green-500' : 'bg-primary'} />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
                      <span>{progress.speed || '--'}</span>
                      <span>{progress.eta ? `ETA ${progress.eta}` : '--'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [urls, setUrls] = useState<{ url: string; format: 'mp3' | 'm4a' }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      format: 'mp3',
    },
  });

  const onSubmit = (data: FormValues) => {
    const inputUrls = data.url.split(',').map((u) => u.trim()).filter(Boolean);
    const newItems = inputUrls.map(u => ({ url: u, format: data.format }));
    setUrls(newItems);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <Music className="w-5 h-5" />
          </div>
          <h1 className="font-bold tracking-tight text-lg">Audio Downloader</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        <div className="bg-card border border-border/50 rounded-lg p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Paste YouTube URL(s) here..." 
                        className="h-14 text-lg bg-muted/50 border-border font-mono placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-destructive font-mono text-sm" />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-auto">
                      <FormControl>
                        <ToggleGroup 
                          type="single" 
                          value={field.value} 
                          onValueChange={(val) => val && field.onChange(val)}
                          className="justify-start border border-border/50 rounded-md p-1 bg-muted/30"
                        >
                          <ToggleGroupItem value="mp3" className="px-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">MP3</ToggleGroupItem>
                          <ToggleGroupItem value="m4a" className="px-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">M4A</ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" size="lg" className="w-full sm:w-auto font-bold uppercase tracking-wider text-primary-foreground px-8">
                  Fetch Info
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          {urls.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground/50 py-12 border-2 border-dashed border-border/20 rounded-lg">
              <Music className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-mono text-sm">Paste any YouTube URL to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {urls.map((item, i) => (
                <VideoItem key={`${item.url}-${i}`} url={item.url} format={item.format} />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center border-t border-border/20">
        <p className="text-xs font-mono text-muted-foreground/40">Built with yt-dlp · FFmpeg · Express</p>
      </footer>
    </div>
  );
}
