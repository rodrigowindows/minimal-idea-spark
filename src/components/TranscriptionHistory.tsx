import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Trash2, Copy, Clock } from 'lucide-react';
import {
  getTranscriptionHistory,
  clearTranscriptionHistory,
  type TranscriptionRecord,
} from '@/lib/audio-transcription';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function TranscriptionHistory() {
  const [records, setRecords] = useState<TranscriptionRecord[]>([]);

  useEffect(() => {
    setRecords(getTranscriptionHistory(50));
  }, []);

  function handleClear() {
    if (!window.confirm('Limpar todo o historico de transcricoes?')) return;
    clearTranscriptionHistory();
    setRecords([]);
    toast.success('Historico limpo!');
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  }

  const langLabel: Record<string, string> = {
    'pt-BR': 'PT',
    en: 'EN',
    es: 'ES',
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Transcription History
          </span>
          {records.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={handleClear}>
              <Trash2 className="h-3 w-3" /> Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma transcricao ainda. Use o microfone para comecar!
          </p>
        ) : (
          <ScrollArea className="h-[320px] pr-2">
            <div className="space-y-2">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className="group rounded-lg border bg-muted/30 p-3 text-sm transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 leading-relaxed">{rec.text}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleCopy(rec.text)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(rec.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {langLabel[rec.language] || rec.language}
                    </Badge>
                    {rec.source_page && (
                      <span className="text-muted-foreground/60">{rec.source_page}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
