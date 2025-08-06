import { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealTimeTranscript } from "@/hooks/useApi";
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Loader2 } from "lucide-react";

interface RealTimeTranscriptProps {
  onTranscriptChange?: (transcript: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  autoStart?: boolean;
  showControls?: boolean;
  className?: string;
}

export default function RealTimeTranscript({
  onTranscriptChange,
  onRecordingStateChange,
  autoStart = false,
  showControls = true,
  className = ""
}: RealTimeTranscriptProps) {
  const [words, setWords] = useState<Array<{
    text: string;
    timestamp: number;
    confidence?: number;
    isFinal: boolean;
  }>>([]);
  const [currentSentence, setCurrentSentence] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  } = useRealTimeTranscript();

  // Auto-scroll to bottom when new words are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [words, currentSentence]);

  // Handle transcript changes
  useEffect(() => {
    onTranscriptChange?.(transcript);
    
    // Parse transcript into words with timing
    if (transcript !== currentSentence) {
      setCurrentSentence(transcript);
      
      // Add new words to the array (this is a simplified version)
      const newWords = transcript.split(' ').filter(word => word.trim().length > 0);
      const timestamp = Date.now();
      
      setWords(prev => {
        const existingText = prev.map(w => w.text).join(' ');
        if (transcript.startsWith(existingText)) {
          // New text is an extension of existing
          const additionalText = transcript.substring(existingText.length).trim();
          if (additionalText) {
            const additionalWords = additionalText.split(' ').map(word => ({
              text: word,
              timestamp,
              confidence: 0.9,
              isFinal: false
            }));
            return [...prev, ...additionalWords];
          }
        } else {
          // Complete refresh of words
          return newWords.map(word => ({
            text: word,
            timestamp,
            confidence: 0.9,
            isFinal: false
          }));
        }
        return prev;
      });
    }
  }, [transcript, currentSentence, onTranscriptChange]);

  // Handle recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isListening);
  }, [isListening, onRecordingStateChange]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && isSupported && !isListening) {
      startListening();
    }
  }, [autoStart, isSupported, isListening, startListening]);

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClear = () => {
    resetTranscript();
    setWords([]);
    setCurrentSentence('');
  };

  const getConfidenceColor = (confidence: number = 0.9) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour12: false, 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  if (!isSupported) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <div>
            <h3 className="text-lg font-semibold">Speech Recognition Not Supported</h3>
            <p className="text-muted-foreground text-sm">
              Your browser doesn't support real-time speech recognition. 
              Please use a modern browser like Chrome or Edge.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col ${className}`}>
      {showControls && (
        <>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Live Transcript</h3>
                {isListening && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Mic className="w-3 h-3 mr-1" />
                    Recording...
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={words.length === 0 && !transcript}
                >
                  Clear
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleToggleRecording}
                  className={isListening ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <Separator />
        </>
      )}

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-64 p-4" ref={scrollRef}>
          {words.length === 0 && !transcript ? (
            <div className="text-center py-8 text-muted-foreground">
              {isListening ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin" />
                  <p>Listening... Start speaking</p>
                </div>
              ) : (
                <p>Click "Start" to begin recording</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Finalized words */}
              <div className="space-y-1">
                {words.filter(w => w.isFinal).map((word, index) => (
                  <span
                    key={index}
                    className={`inline-block mr-1 px-1 rounded ${getConfidenceColor(word.confidence)}`}
                    title={`Confidence: ${Math.round((word.confidence || 0.9) * 100)}% | ${formatTimestamp(word.timestamp)}`}
                  >
                    {word.text}
                  </span>
                ))}
              </div>
              
              {/* Current/interim transcript */}
              {transcript && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary mb-1">Current Speech:</p>
                      <p className="leading-relaxed">{transcript}</p>
                    </div>
                    {isListening && (
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Stats footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Words: {transcript.split(' ').filter(w => w.trim().length > 0).length}
          </span>
          <span>
            Status: {isListening ? 'Recording' : 'Stopped'}
          </span>
          {words.length > 0 && (
            <span>
              Last: {formatTimestamp(Math.max(...words.map(w => w.timestamp)))}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
