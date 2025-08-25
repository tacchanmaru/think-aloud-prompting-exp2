'use client';

import { useState, useRef } from 'react';
import { FaImage } from 'react-icons/fa';
import { getProductForExperiment, ExperimentPageType } from '../../lib/experimentUtils';
import { useAuth } from '../contexts/AuthContext';

interface ProductImageUploadPhaseProps {
    onComplete: (imageFile: File, imagePreview: string, generatedText: string) => Promise<void>;
    isPractice?: boolean;
    pageType: ExperimentPageType;
    onMicrophoneConnecting?: (isConnecting: boolean) => void;
}

const ProductImageUploadPhase: React.FC<ProductImageUploadPhaseProps> = ({ onComplete, isPractice = false, pageType }) => {
    const { userId } = useAuth();
    const currentProduct = getProductForExperiment(userId, pageType, isPractice);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedText, setGeneratedText] = useState<string | null>(null);
    const [showStartButton, setShowStartButton] = useState(false);
    const [isConnectingMicrophone, setIsConnectingMicrophone] = useState(false);

    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
        // Reset input value to allow selecting the same file again
        event.target.value = '';
    };

    const handleTakePhoto = () => {
        cameraInputRef.current?.click();
    };

    // const handleUseDefaultImage = () => {
    //     // Use current product's image
    //     const defaultImageUrl = currentProduct.imagePreviewUrl;
    //     const fileName = currentProduct.imagePreviewUrl?.split('/').pop() || 'default.jpeg';
        
    //     // Create a sample file object for consistency
    //     if (!defaultImageUrl) {
    //         setError('デフォルト画像が見つかりません。');
    //         return;
    //     }
        
    //     fetch(defaultImageUrl)
    //         .then(res => res.blob())
    //         .then(blob => {
    //             const file = new File([blob], fileName, { type: 'image/jpeg' });
    //             setImageFile(file);
    //             setImagePreview(defaultImageUrl);
    //         })
    //         .catch(err => {
    //             console.error('Failed to load default image:', err);
    //             setError('デフォルト画像の読み込みに失敗しました。');
    //         });
    // };

    const generateDescriptionFromImage = async () => {
        if (!imageFile || !imagePreview) return;
        
        setIsGenerating(true);
        setError(null);
        
        try {
            // TODO: Implement API call to generate product description
            // For now, simulate with a delay and generate sample text based on image
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Use current product's text
            const randomText = currentProduct.text;
            
            // Store the generated text and show the start button
            setGeneratedText(randomText);
            setShowStartButton(true);
        } catch {
            setError('テキスト生成に失敗しました。');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStartEditing = async () => {
        if (imageFile && imagePreview && generatedText) {
            setIsConnectingMicrophone(true);
            
            try {
                // Wait for parent to handle microphone permission + WebSocket connection
                await onComplete(imageFile, imagePreview, generatedText);
            } catch (error) {
                console.error('Failed to start editing:', error);
                setError('編集の開始に失敗しました。');
                setIsConnectingMicrophone(false);
            }
        }
    };

    return (
        <div className="upload-phase">
            <div className="product-layout">
                <h2>画像から商品説明を生成</h2>
                {!imagePreview && (
                    <p className="target-product">対象：{currentProduct.name}</p>
                )}
                <div className="product-image-container">
                    {imagePreview ? (
                        <img src={imagePreview} alt="選択された画像" className="product-image" />
                    ) : (
                        <div className="upload-placeholder clickable-upload" onClick={handleTakePhoto}>
                            <FaImage />
                            <p>商品の写真を撮影</p>
                        </div>
                    )}
                </div>
                
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                />
                
                {/* Developer-only default image button */}
                {/* {!generatedText && !imageFile && (
                    <div className="dev-controls">
                        <button 
                            className="dev-default-button"
                            onClick={handleUseDefaultImage}
                            title="開発者用：デフォルト画像を使用"
                        >
                            🔧 デフォルト画像
                        </button>
                    </div>
                )} */}
                
                {imageFile && !generatedText && (
                    <button 
                        className="generate-button"
                        onClick={generateDescriptionFromImage}
                        disabled={isGenerating}
                    >
                        {isGenerating ? '生成中...' : '商品説明文を生成'}
                    </button>
                )}
                
                {generatedText && (
                    <div className="product-description-container">
                        <h3 className="product-description-header">商品説明</h3>
                        <div className="generated-text">
                            {generatedText}
                        </div>
                        {showStartButton && (
                            <div>
                                {isConnectingMicrophone && (
                                    <div className="microphone-connecting">
                                        <div className="spinner"></div>
                                        <p>マイクに接続中...</p>
                                    </div>
                                )}
                                <button 
                                    className="start-edit-button"
                                    onClick={handleStartEditing}
                                    disabled={isConnectingMicrophone}
                                >
                                    {isConnectingMicrophone ? '接続中...' : '編集開始'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {error && <div className="error-message">{error}</div>}
            </div>
        </div>
    );
};

export default ProductImageUploadPhase;
