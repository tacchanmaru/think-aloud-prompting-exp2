'use client';

import { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductImageUploadPhase from '../components/ProductImageUploadPhase';


// =========== ThinkAloudPage Component ===========
function ThinkAloudPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isPractice = searchParams.get('practice') === 'true';
    
    const [mode, setMode] = useState<'upload' | 'edit'>('upload');
    
    // Application state
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    // Text editing state
    const [textContent, setTextContent] = useState('');
    const [originalText, setOriginalText] = useState('');
    
    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptItems, setTranscriptItems] = useState<{id: number, text: string}[]>([]);
    
    const websocketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const isConnectedRef = useRef<boolean>(false);
    const isRecordingStateRef = useRef<boolean>(false);
    const streamRef = useRef<MediaStream | null>(null);


    const handleUploadComplete = (imageFile: File, imagePreview: string, generatedText: string) => {
        setImagePreview(imagePreview);
        setTextContent(generatedText);
        setOriginalText(generatedText);
        setMode('edit');
        
        // Automatically start recording when entering edit mode
        setTimeout(() => {
            startRecording();
        }, 500); // Small delay to ensure UI has updated
    };

    const handleRecordClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        setError(null);
        if (isRecording) return;

        try {
            setIsTranscribing(true);
            isConnectedRef.current = false;

            // Get ephemeral token for direct WebSocket connection
            const tokenResponse = await fetch('/api/auth/openai-token', { method: 'POST' });
            if (!tokenResponse.ok) {
                const errorBody = await tokenResponse.text();
                throw new Error(`Ephemeral tokenの取得に失敗しました。 Status: ${tokenResponse.status}, Body: ${errorBody}`);
            }
            const responseData = await tokenResponse.json();
            const ephemeralToken = responseData.token;

            if (typeof ephemeralToken !== 'string') {
                console.error("無効なephemeral tokenを受信しました:", responseData);
                throw new Error('Ephemeral tokenが文字列ではありません。');
            }

            // Setup direct WebSocket connection with subprotocols
            const ws = new WebSocket(
                'wss://api.openai.com/v1/realtime?intent=transcription',
                [
                    'realtime',
                    `openai-insecure-api-key.${ephemeralToken}`,
                    'openai-beta.realtime-v1',
                ]
            );
            websocketRef.current = ws;

            ws.onopen = async () => {
                isConnectedRef.current = true;
                isRecordingStateRef.current = true;
                setIsRecording(true);
                setIsTranscribing(false);

                // Send transcription session configuration
                const configMessage = {
                    type: 'transcription_session.update',
                    session: {
                        input_audio_transcription: {
                            model: 'gpt-4o-transcribe',
                            language: 'ja',
                        },
                        input_audio_noise_reduction: { type: 'near_field' },
                        turn_detection: {
                            type: 'server_vad',
                        },
                    },
                };
                ws.send(JSON.stringify(configMessage));

                // Setup audio processing
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { sampleRate: 24000, channelCount: 1 }
                    });
                    streamRef.current = stream;

                    // Create audio worklet processor code inline
                    const audioWorkletCode = `
                        class PCMProcessor extends AudioWorkletProcessor {
                            constructor() {
                                super();
                                this.sampleRate = 24000;
                                this.chunkSize = this.sampleRate * 0.1;
                                this.buffer = [];
                            }

                            process(inputs, outputs, parameters) {
                                const input = inputs[0];
                                if (input && input[0]) {
                                    const float32Data = input[0];
                                    this.buffer.push(...float32Data);

                                    while (this.buffer.length >= this.chunkSize) {
                                        const chunk = this.buffer.slice(0, this.chunkSize);
                                        this.buffer = this.buffer.slice(this.chunkSize);

                                        const int16Buffer = new Int16Array(chunk.length);
                                        for (let i = 0; i < chunk.length; i++) {
                                            int16Buffer[i] = Math.max(-1, Math.min(1, chunk[i])) * 0x7fff;
                                        }

                                        this.port.postMessage(int16Buffer.buffer, [int16Buffer.buffer]);
                                    }
                                }
                                return true;
                            }
                        }
                        registerProcessor('pcm-processor', PCMProcessor);
                    `;

                    const audioContext = new AudioContext({ sampleRate: 24000 });
                    audioContextRef.current = audioContext;

                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                    }

                    const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
                    const workletURL = URL.createObjectURL(blob);
                    await audioContext.audioWorklet.addModule(workletURL);
                    URL.revokeObjectURL(workletURL);

                    const source = audioContext.createMediaStreamSource(stream);
                    const pcmProcessor = new AudioWorkletNode(audioContext, 'pcm-processor');
                    audioWorkletNodeRef.current = pcmProcessor;

                    pcmProcessor.port.onmessage = (event) => {
                        if (ws.readyState === WebSocket.OPEN && event.data) {
                            try {
                                const buffer = Buffer.from(event.data);
                                const base64Audio = buffer.toString('base64');

                                ws.send(JSON.stringify({
                                    type: 'input_audio_buffer.append',
                                    audio: base64Audio,
                                }));
                            } catch (audioError) {
                                console.warn('Failed to send audio data:', audioError);
                            }
                        }
                    };

                    source.connect(pcmProcessor);
                    pcmProcessor.connect(audioContext.destination);

                } catch (audioErr) {
                    console.error("Error accessing microphone:", audioErr);
                    setError(`マイクアクセスエラー: ${audioErr instanceof Error ? audioErr.message : String(audioErr)}`);
                }
            };

            ws.onmessage = (event) => {
                if (!isConnectedRef.current || !isRecordingStateRef.current) {
                    return;
                }

                const message = JSON.parse(event.data);

                switch (message.type) {
                    case 'conversation.item.input_audio_transcription.completed':
                        if (isConnectedRef.current && isRecordingStateRef.current) {
                            if (message.transcript) {
                                console.log('Transcript received:', message.transcript);
                                // Add new transcript item
                                const newItem = {
                                    id: Date.now(),
                                    text: message.transcript
                                };
                                setTranscriptItems(prev => [...prev, newItem]);
                                
                                // Remove this item after 3 seconds
                                setTimeout(() => {
                                    setTranscriptItems(prev => prev.filter(item => item.id !== newItem.id));
                                }, 3000);
                                
                                // TODO: Send transcript to text modification API
                            }
                        }
                        break;
                    case 'error':
                        console.error('Server error:', message);
                        setError(`OpenAI API エラー: ${message.error?.message || 'Unknown error'}`);
                        break;
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setError(`WebSocket接続エラーが発生しました。`);
                stopRecording();
            };

            ws.onclose = (event) => {
                if (isConnectedRef.current && isRecording) {
                    setError(`WebSocket接続が予期せず閉じられました: ${event.reason || 'Unknown reason'}`);
                    stopRecording();
                }
            };

        } catch (error) {
            const message = error instanceof Error ? error.message : "予期しないエラーが発生しました。";
            setError(`録音開始に失敗しました: ${message}`);
            stopRecording();
        }
    };

    const stopRecording = () => {
        isConnectedRef.current = false;
        isRecordingStateRef.current = false;
        setIsRecording(false);
        setIsTranscribing(false);

        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            try {
                websocketRef.current.send(JSON.stringify({
                    type: 'input_audio_buffer.clear'
                }));
                setTimeout(() => {
                    if (websocketRef.current) {
                        websocketRef.current.close();
                        websocketRef.current = null;
                    }
                }, 100);
            } catch (error) {
                console.warn('Failed to clear audio buffer:', error);
                if (websocketRef.current) {
                    websocketRef.current.close();
                    websocketRef.current = null;
                }
            }
        } else if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
        }

        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleComplete = () => {
        alert('実験が完了しました。ありがとうございました。');
        router.push('/');
    };

    return (
        <div className="app-container">
            <div className="content-area">
                {mode === 'upload' ? (
                    <ProductImageUploadPhase onComplete={handleUploadComplete} />
                ) : (
                    <div className="edit-phase">
                        <div className="image-section">
                            {imagePreview && (
                                <img src={imagePreview} alt="商品画像" className="product-image" />
                            )}
                        </div>
                        <div className="text-section">
                            <div className="text-header">
                                <h3>商品説明</h3>
                            </div>
                            <textarea
                                className={`text-editor ${isRecording ? 'recording' : ''}`}
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder="商品説明を編集してください..."
                                rows={10}
                            />
                            <div className="controls">
                                <div className="transcription-display">
                                    <div className="transcription-header">
                                        {isRecording ? '🎙️ 音声認識中' : isTranscribing ? '接続中...' : '音声入力待機中'}
                                    </div>
                                    <div className="transcript-items">
                                        {transcriptItems.map((item) => (
                                            <span key={item.id} className="transcript-bubble">
                                                {item.text}
                                            </span>
                                        ))}
                                        {transcriptItems.length === 0 && (
                                            <span className="no-transcript">
                                                まだ音声が認識されていません
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="complete-button-full"
                                    onClick={handleComplete}
                                    disabled={isRecording}
                                >
                                    完了
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error && <div className="error">{error}</div>}
        </div>
    );
}

export default ThinkAloudPage;