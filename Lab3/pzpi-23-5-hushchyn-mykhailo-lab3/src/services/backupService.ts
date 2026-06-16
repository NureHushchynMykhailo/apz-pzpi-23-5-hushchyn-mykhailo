import api from '../config/axios';

export const backupService = {
  /**
   * Завантажити повну резервну копію (схема + всі дані)
   */
  downloadFull: async (): Promise<Blob> => {
    const response = await api.get('/backups/full', { 
      responseType: 'blob' // Важливо для завантаження файлів
    });
    return response.data;
  },

  /**
   * Завантажити резервну копію тільки телеметрії
   */
  downloadTelemetry: async (): Promise<Blob> => {
    const response = await api.get('/backups/telemetry', { 
      responseType: 'blob' 
    });
    return response.data;
  },

  /**
   * Відновити базу даних із файлу .sql
   */
  restore: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/backups/restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};