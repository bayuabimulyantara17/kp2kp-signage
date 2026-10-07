import { google } from 'googleapis';
import { Readable } from 'stream';

export interface DriveVideoFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime?: string;
  modifiedTime?: string;
}

export class GoogleDriveService {
  private getClient() {
    const rawFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
    const folderId = rawFolderId.replace(/.*folders\//, '').replace(/\?.*/, '').trim();

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!clientEmail || !privateKey || !folderId) {
      return null;
    }

    try {
      const auth = new google.auth.JWT(
        clientEmail,
        undefined,
        privateKey,
        ['https://www.googleapis.com/auth/drive.readonly']
      );
      const drive = google.drive({ version: 'v3', auth });
      return { drive, folderId };
    } catch (err) {
      console.error("Failed to initialize Google Drive client:", err);
      return null;
    }
  }

  /**
   * Scans the 'Materi_TV_DJP' Google Drive folder for video files.
   */
  async listVideosInFolder(): Promise<DriveVideoFile[]> {
    const client = this.getClient();
    if (!client) {
      console.warn("Google Drive credentials not set. Returning mock Materi_TV_DJP videos.");
      return [
        {
          id: "1A2B3C4D_sample_video_1",
          name: "01_Profil_Layanan_KP2KP_Portrait.mp4",
          mimeType: "video/mp4",
          size: 24500000,
          createdTime: new Date().toISOString()
        },
        {
          id: "1E2F3G4H_sample_video_2",
          name: "02_Edukasi_SPT_Tahunan_DJP.mp4",
          mimeType: "video/mp4",
          size: 38200000,
          createdTime: new Date().toISOString()
        },
        {
          id: "1I2J3K4L_sample_video_3",
          name: "03_Anti_Korupsi_Gratifikasi_KP2KP.mp4",
          mimeType: "video/mp4",
          size: 19800000,
          createdTime: new Date().toISOString()
        }
      ];
    }

    try {
      const response = await client.drive.files.list({
        q: `'${client.folderId}' in parents and (mimeType contains 'video/' or name contains '.mp4' or name contains '.mov' or name contains '.MOV' or name contains '.MP4') and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
        orderBy: 'name',
        pageSize: 100
      });

      const rawFiles = response.data.files || [];
      const videoExtensions = ['.mp4', '.mov', '.m4v', '.mkv'];
      const videoFiles = rawFiles.filter((f: any) => {
        const name = (f.name || '').toLowerCase();
        const mime = (f.mimeType || '').toLowerCase();
        return videoExtensions.some(ext => name.endsWith(ext)) || (mime.startsWith('video/') && !name.endsWith('.jpg') && !name.endsWith('.png'));
      });

      return videoFiles.map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType || 'video/mp4',
        size: parseInt(f.size || '0', 10),
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime
      }));
    } catch (error) {
      console.error("Error reading Google Drive folder:", error);
      throw error;
    }
  }

  /**
   * Fetches file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<DriveVideoFile | null> {
    const client = this.getClient();
    if (!client) {
      return null;
    }

    try {
      const res = await client.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime'
      });
      return {
        id: res.data.id,
        name: res.data.name,
        mimeType: res.data.mimeType,
        size: parseInt(res.data.size || '0', 10),
        createdTime: res.data.createdTime,
        modifiedTime: res.data.modifiedTime
      };
    } catch (e) {
      console.error("Error getting drive file metadata:", e);
      return null;
    }
  }

  /**
   * Streams file content from Google Drive with optional HTTP range support
   */
  async getFileStream(fileId: string, range?: string): Promise<{ stream: Readable; headers: Record<string, string> }> {
    const client = this.getClient();
    if (!client) {
      throw new Error("Google Drive credentials not configured.");
    }

    const headers: Record<string, string> = {};
    if (range) {
      headers['Range'] = range;
    }

    const response = await client.drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream', headers }
    );

    return {
      stream: response.data,
      headers: {
        'Content-Type': response.headers['content-type'] || 'video/mp4',
        'Content-Length': response.headers['content-length'] || '',
        'Accept-Ranges': 'bytes'
      }
    };
  }
}

export const googleDriveService = new GoogleDriveService();
