// lib/api/reports.ts
import { apiClient } from './client';

export interface Report {
  id: string;
  name: string;
  type: 'summary' | 'results' | 'incidents' | 'agents' | 'wards';
  format: 'pdf' | 'csv' | 'excel';
  generatedAt: string;
  generatedBy: string;
  size: string;
  status: 'ready' | 'processing' | 'failed';
  url?: string | null;
}

export interface ReportStats {
  totalReports: number;
  ready: number;
  processing: number;
  failed: number;
  recentReports: Report[];
}

export interface ReportsResponse {
  success: boolean;
  reports: Report[];
  stats: ReportStats;
  error?: string;
  message?: string;
}

export interface GenerateReportResponse {
  success: boolean;
  message: string;
  report: Report;
  error?: string;
}

export interface DeleteReportResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Create the reportsApi object
export const reportsApi = {
  getReports: async (zoneId: string): Promise<ReportsResponse> => {
    try {
      console.log('📡 Fetching reports for zone:', zoneId);
      const response = await apiClient.get<ReportsResponse>(`/admin/zone/${zoneId}/reports`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      throw error;
    }
  },

  generateReport: async (
    zoneId: string,
    data: {
      type: 'summary' | 'results' | 'incidents' | 'agents' | 'wards';
      format: 'pdf' | 'csv' | 'excel';
      wardId?: string | null;
    }
  ): Promise<GenerateReportResponse> => {
    try {
      console.log('📡 Generating report for zone:', zoneId, data);
      const response = await apiClient.post<GenerateReportResponse>(
        `/admin/zone/${zoneId}/reports/generate`,
        data
      );
      return response;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  },

  downloadReport: async (reportId: string): Promise<Blob> => {
    try {
      console.log('📡 Downloading report:', reportId);
      
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      // Try multiple possible endpoint paths
      const endpoints = [
        `${API_BASE_URL}/admin/reports/download/${reportId}`,
        `${API_BASE_URL}/reports/download/${reportId}`,
      ];
      
      let lastError: Error | null = null;
      
      for (const url of endpoints) {
        try {
          console.log('📡 Trying endpoint:', url);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const blob = await response.blob();
            console.log('📡 Download successful from:', url);
            return blob;
          }
          
          // Store error but continue to next endpoint
          const errorText = await response.text();
          console.warn('⚠️ Endpoint failed:', url, response.status, errorText);
          lastError = new Error(`Download failed: ${response.status} - ${errorText}`);
        } catch (err) {
          lastError = err as Error;
          console.warn('⚠️ Endpoint error:', url, err);
        }
      }
      
      // If all endpoints failed
      throw lastError || new Error('Failed to download report from all endpoints');
    } catch (error) {
      console.error('❌ Error downloading report:', error);
      throw error;
    }
  },

  deleteReport: async (zoneId: string, reportId: string): Promise<DeleteReportResponse> => {
    try {
      console.log('📡 Deleting report:', reportId);
      const response = await apiClient.delete<DeleteReportResponse>(
        `/admin/zone/${zoneId}/reports/${reportId}`
      );
      return response;
    } catch (error) {
      console.error('❌ Error deleting report:', error);
      throw error;
    }
  },

  getReportStats: async (zoneId: string): Promise<ReportStats> => {
    try {
      console.log('📡 Fetching report stats for zone:', zoneId);
      const response = await apiClient.get<ReportsResponse>(`/admin/zone/${zoneId}/reports`);
      return response.stats || {
        totalReports: 0,
        ready: 0,
        processing: 0,
        failed: 0,
        recentReports: [],
      };
    } catch (error) {
      console.error('❌ Error fetching report stats:', error);
      throw error;
    }
  },

  downloadReportWithFilename: async (reportId: string, filename?: string): Promise<void> => {
    try {
      const blob = await reportsApi.downloadReport(reportId);
      
      // Determine file extension from content-type or default to pdf
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use provided filename or generate one
      if (filename) {
        // If filename doesn't have extension, try to determine from blob
        if (!filename.includes('.')) {
          const contentType = blob.type;
          const ext = contentType === 'application/pdf' ? 'pdf' :
                     contentType === 'text/csv' ? 'csv' :
                     contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? 'xlsx' :
                     'pdf';
          link.download = `${filename}.${ext}`;
        } else {
          link.download = filename;
        }
      } else {
        link.download = `report_${reportId}.pdf`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('📡 Download completed:', reportId);
    } catch (error) {
      console.error('❌ Error downloading report with filename:', error);
      throw error;
    }
  },

  getReportTypes: (): { value: string; label: string }[] => {
    return [
      { value: 'summary', label: 'Summary Report' },
      { value: 'results', label: 'Election Results' },
      { value: 'incidents', label: 'Incidents Report' },
      { value: 'agents', label: 'Agents Report' },
      { value: 'wards', label: 'Wards Report' },
    ];
  },

  getReportFormats: (): { value: string; label: string }[] => {
    return [
      { value: 'pdf', label: 'PDF' },
      { value: 'csv', label: 'CSV' },
      { value: 'excel', label: 'Excel' },
    ];
  },

  getStatusColor: (status: string): string => {
    switch (status) {
      case 'ready': return 'bg-green-500 text-white';
      case 'processing': return 'bg-yellow-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  },

  getStatusIcon: (status: string): string => {
    switch (status) {
      case 'ready': return 'check-circle';
      case 'processing': return 'loader';
      case 'failed': return 'alert-triangle';
      default: return 'file';
    }
  },

  getTypeIcon: (type: string): string => {
    switch (type) {
      case 'summary': return 'file-pie-chart';
      case 'results': return 'file-check';
      case 'incidents': return 'alert-triangle';
      case 'agents': return 'users';
      case 'wards': return 'building-2';
      default: return 'file';
    }
  },

  getFormatIcon: (format: string): string => {
    switch (format) {
      case 'pdf': return 'file';
      case 'csv': return 'file-spreadsheet';
      case 'excel': return 'file-spreadsheet';
      default: return 'file';
    }
  },
};

// Export the hook
export function useReportsApi() {
  return {
    getReports: reportsApi.getReports,
    generateReport: reportsApi.generateReport,
    downloadReport: reportsApi.downloadReport,
    deleteReport: reportsApi.deleteReport,
    getReportStats: reportsApi.getReportStats,
    downloadReportWithFilename: reportsApi.downloadReportWithFilename,
    getReportTypes: reportsApi.getReportTypes,
    getReportFormats: reportsApi.getReportFormats,
    getStatusColor: reportsApi.getStatusColor,
    getStatusIcon: reportsApi.getStatusIcon,
    getTypeIcon: reportsApi.getTypeIcon,
    getFormatIcon: reportsApi.getFormatIcon,
  };
}

// Default export
export default reportsApi;