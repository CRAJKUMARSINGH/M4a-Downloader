import { useState, useEffect } from 'react';

export interface SSEEvent {
  status: 'pending' | 'fetching' | 'downloading' | 'converting' | 'done' | 'error';
  progress: number;
  speed: string;
  eta: string;
  filename: string;
  error: string;
}

export function useJobProgress(jobId?: string | null) {
  const [data, setData] = useState<SSEEvent>({
    status: 'pending',
    progress: 0,
    speed: '',
    eta: '',
    filename: '',
    error: '',
  });

  useEffect(() => {
    if (!jobId) return;

    setData({
      status: 'pending',
      progress: 0,
      speed: '',
      eta: '',
      filename: '',
      error: '',
    });

    const url = `/api/downloads/${jobId}/events`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SSEEvent;
        setData(parsed);
        if (parsed.status === 'done' || parsed.status === 'error') {
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    };

    eventSource.onerror = () => {
      setData((prev) => ({ ...prev, status: 'error', error: 'Connection lost' }));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return data;
}
