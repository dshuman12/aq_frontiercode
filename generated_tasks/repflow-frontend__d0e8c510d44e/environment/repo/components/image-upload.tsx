"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Upload, X, Loader2, User, Camera, ZoomIn } from "lucide-react";

interface ImageUploadProps {
    onImageUpload: (imageUrl: string) => void | Promise<void>;
    currentImageUrl?: string;
    label?: string;
    description?: string;
    className?: string;
    showPreview?: boolean;
}

/**
 * Draws the cropped region of an image onto a canvas and returns it as a JPEG File.
 * Used to produce a 1:1 square crop before uploading to S3.
 */
async function getCroppedImageBlob(
    imageSrc: string,
    cropArea: Area,
    fileName: string
): Promise<File> {
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Canvas toBlob failed"));
            resolve(new File([blob], fileName, { type: "image/jpeg" }));
        }, "image/jpeg", 0.92);
    });
}

export function ImageUpload({
    onImageUpload,
    currentImageUrl,
    label = "Profile Image",
    description = "Upload a profile image. Max size 5MB. Supported formats: JPEG, PNG, WebP.",
    className = "",
    showPreview = true
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");
    const [previewUrl, setPreviewUrl] = useState(currentImageUrl || "");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop dialog state
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
    const [rawFile, setRawFile] = useState<File | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Sync preview URL when currentImageUrl prop changes
    useEffect(() => {
        setPreviewUrl(currentImageUrl || "");
    }, [currentImageUrl]);

    /** Called by react-easy-crop when the user adjusts the crop area */
    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    /**
     * When a file is selected, open the crop dialog instead of uploading immediately.
     * This lets the user adjust the crop to a 1:1 square before we send it to S3.
     */
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setError("Invalid file type. Please select a JPEG, PNG, or WebP image.");
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setError("File too large. Please select an image under 5MB.");
            return;
        }

        setError("");

        // Read the file and open the crop dialog
        const reader = new FileReader();
        reader.onload = (e) => {
            setRawImageUrl(e.target?.result as string);
            setRawFile(file);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCropDialogOpen(true);
        };
        reader.readAsDataURL(file);
    };

    /** Crop the image, then upload the cropped version to S3 */
    const handleCropConfirm = async () => {
        if (!rawImageUrl || !croppedAreaPixels || !rawFile) return;

        setCropDialogOpen(false);
        setIsUploading(true);

        try {
            // Produce a cropped 1:1 file from the user's selection
            const croppedFile = await getCroppedImageBlob(
                rawImageUrl,
                croppedAreaPixels,
                rawFile.name
            );

            // Show immediate preview of the cropped image
            if (showPreview) {
                const croppedPreview = URL.createObjectURL(croppedFile);
                setPreviewUrl(croppedPreview);
            }

            // Upload cropped file to S3
            const formData = new FormData();
            formData.append("file", croppedFile);

            const response = await fetch("/api/upload/profile-image", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Upload failed");
            }

            const imageUrl = data.imageUrl ?? data.url;
            if (!imageUrl) {
                throw new Error("Upload succeeded but no image URL returned");
            }

            await Promise.resolve(onImageUpload(imageUrl));
            setPreviewUrl(imageUrl);
            setError("");
        } catch (error: any) {
            console.error("Upload error:", error);
            setError(error.message || "Failed to upload image. Please try again.");
            setPreviewUrl(currentImageUrl || "");
        } finally {
            setIsUploading(false);
            setRawImageUrl(null);
            setRawFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    /** Close the crop dialog without uploading */
    const handleCropCancel = () => {
        setCropDialogOpen(false);
        setRawImageUrl(null);
        setRawFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = () => {
        setPreviewUrl("");
        onImageUpload("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Show label and description if provided */}
            {(label || description) && (
                <div className="space-y-2">
                    {label && <Label>{label}</Label>}
                    {description && <p className="text-sm text-gray-600">{description}</p>}
                </div>
            )}

            {error && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex items-center space-x-4">
                {/* Avatar Preview - only show if showPreview is true */}
                {showPreview && (
                    <div className="relative">
                        <Avatar className="w-20 h-20">
                            <AvatarImage src={previewUrl} alt="Profile preview" />
                            <AvatarFallback className="bg-gray-100">
                                <User className="w-8 h-8 text-gray-400" />
                            </AvatarFallback>
                        </Avatar>
                    </div>
                )}

                {/* Upload Controls */}
                <div className="flex flex-col space-y-2">
                    <Button
                        variant="outline"
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex items-center space-x-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                {previewUrl ? (
                                    <>
                                        <Camera className="w-4 h-4" />
                                        <span>Change Image</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        <span>Upload Image</span>
                                    </>
                                )}
                            </>
                        )}
                    </Button>

                    {previewUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveImage}
                            disabled={isUploading}
                            className="text-red-600 hover:text-red-700"
                        >
                            Remove Image
                        </Button>
                    )}
                </div>
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Crop Dialog — opens after selecting a file */}
            <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Crop Profile Image</DialogTitle>
                    </DialogHeader>

                    {/* Crop area with circular mask for profile pictures */}
                    <div className="relative w-full h-72 bg-gray-900 rounded-lg overflow-hidden">
                        {rawImageUrl && (
                            <Cropper
                                image={rawImageUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        )}
                    </div>

                    {/* Zoom slider */}
                    <div className="flex items-center gap-3 px-1">
                        <ZoomIn className="w-4 h-4 text-gray-500 shrink-0" />
                        <Slider
                            min={1}
                            max={3}
                            step={0.05}
                            value={[zoom]}
                            onValueChange={([val]) => setZoom(val)}
                            className="flex-1"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={handleCropCancel}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCropConfirm}
                            className="bg-figma-forest-dark text-white hover:bg-figma-forest-dark/90"
                        >
                            Apply & Upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
