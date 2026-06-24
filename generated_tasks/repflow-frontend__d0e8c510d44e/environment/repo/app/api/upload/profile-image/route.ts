import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_COGNITO_REGION } from "@/app/constants/constants";

// Initialize S3 client with AWS SDK v3
// If on AppRunner and access, use IAM instance role credentials
let s3Client: S3Client;
if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
        region: AWS_COGNITO_REGION,
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
    });
} else {
    s3Client = new S3Client({
        region: AWS_COGNITO_REGION,
    });
}

const BUCKET_NAME = "repflow-user-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
    try {
        // For onboarding, we'll allow uploads without full authentication
        // In production, you might want to add some form of validation here

        // Parse form data
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed." },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 5MB." },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `profile-images/onboarding/${timestamp}-${randomString}.${fileExtension}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to S3
        const uploadCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
            ContentDisposition: 'inline',
            Metadata: {
                'upload-timestamp': timestamp.toString(),
                'original-filename': file.name,
            },
        });

        await s3Client.send(uploadCommand);

        // Generate the public URL
        const imageUrl = `https://${BUCKET_NAME}.s3.${AWS_COGNITO_REGION}.amazonaws.com/${fileName}`;

        return NextResponse.json({
            message: "Image uploaded successfully",
            url: imageUrl,
            imageUrl,
            fileName,
        });

    } catch (error: any) {
        console.error("Error uploading image to S3:", error);
        
        if (error.name === 'NoSuchBucket') {
            return NextResponse.json(
                { error: "Storage bucket not found. Please contact support." },
                { status: 500 }
            );
        }

        if (error.name === 'AccessDenied') {
            return NextResponse.json(
                { error: "Access denied to storage service. Please contact support." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: "Failed to upload image. Please try again." },
            { status: 500 }
        );
    }
}

// Optional: GET endpoint to check upload endpoint status
export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({
            message: "Upload endpoint ready",
            allowedTypes: ALLOWED_TYPES,
            maxFileSize: MAX_FILE_SIZE,
            bucket: BUCKET_NAME,
        });

    } catch (error) {
        console.error("Error in upload endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
