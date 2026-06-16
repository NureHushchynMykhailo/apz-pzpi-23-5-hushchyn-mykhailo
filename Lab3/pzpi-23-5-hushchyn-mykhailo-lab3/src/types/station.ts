export type StationStatus = 'active' | 'offline' | 'maintenance';

export interface Station {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  status: StationStatus;
}

// Тип для створення нової станції (Data Transfer Object)
export interface CreateStationDTO {
  name: string;
  latitude?: number;
  longitude?: number;
  status?: StationStatus;
}