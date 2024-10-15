const { createReadStream, statSync } = require('fs');
const { basename } = require('path');
const { post } = require('axios');
const FormData = require('form-data');

const CHUNK_SIZE = 30 * 1024 * 1024; // 30 MB
const SERVER_URL = process.env.SERVER_URL; // 'https://api.dev.dedoai.org/v1/upload-dataset';

class Uploader {
    currentUploadId = null;
    currentFileName = null;
    bucketName = null;
    bucketUrl = null;

    constructor(filePath, token, fileType, metadata, entityId, entityName) {
        this.filePath = filePath;
        this.token = token;
        this.fileType = fileType;
        this.metadata = metadata;
        this.entityId = entityId;
        this.entityName = entityName;
    }

    async upload() {
        const fileSize = statSync(this.filePath).size;
        const fileName = basename(this.filePath);

        console.log(`Starting upload: ${fileName}`);

        try {
            console.log('Init upload...');
            const initResponse = await post(`${SERVER_URL}/init-upload`, {
                contentType: this.fileType
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'principalid': this.token
                }
            });

            const { uploadId, fileName, bucketName } = initResponse.data.data;
            this.currentUploadId = uploadId;
            this.currentFileName = fileName;
            this.bucketName = bucketName;
            console.log(`Success init upload. UploadId: ${uploadId}`);

            const parts = [];
            const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
            console.log(`File split into ${totalChunks} chunks`);

            for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
                const start = (partNumber - 1) * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, fileSize);
                const chunk = createReadStream(this.filePath, { start, end });

                console.log(`Preparing chunk ${partNumber}/${totalChunks}`);

                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('partNumber', partNumber);
                formData.append('uploadId', this.currentUploadId);
                formData.append('fileName', this.currentFileName);

                console.log(`Sending chunk ${partNumber}/${totalChunks}`);
                const chunkResponse = await post(`${SERVER_URL}/upload-chunk`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'principalid': this.token
                    }
                });

                const { eTag } = chunkResponse.data.data;
                parts.push({ partNumber, eTag });

                console.log(`Chunk ${partNumber}/${totalChunks} successfully uploaded`);
            }

            console.log('Completing upload...');
            const completeResponse = await post(`${SERVER_URL}/complete-upload`, {
                uploadId: this.currentUploadId,
                fileType: this.fileType,
                fileName: this.currentFileName,
                entityId: this.entityId,
                entityName: this.entityName,
                parts,
                metadata: this.metadata
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'principalid': this.token
                }
            });

            const { bucketUrl } = completeResponse.data;
            this.bucketUrl = bucketUrl;

            console.log(`Successfully completed upload: ${bucketUrl}`);
            return true;
        } catch (error) {
            console.error('Upload error:', error.message);
            if (this.currentUploadId) {
                await this.abort();
            }
            return false;
        } finally {
            this.currentUploadId = null;
            this.currentFileName = null;
        }
    }

    async abort() {
        if (!this.currentUploadId || !this.currentFileName) {
            console.log('No upload in progress');
            return;
        }

        try {
            const response = await post(`${SERVER_URL}/abort-upload`, {
                uploadId: this.currentUploadId,
                fileName: this.currentFileName
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'principalid': this.token
                }
            });

            console.log(`Successfully aborted upload: ${response.data.message}`);
        } catch (error) {
            console.error('Abort error:', error.message);
        } finally {
            this.currentUploadId = null;
            this.currentFileName = null;
        }
    }
}

module.exports = Uploader;