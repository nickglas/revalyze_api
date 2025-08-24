// src/types/employee-metrics.dto.ts
export interface EmployeeScatterPoint {
  id: string;
  name: string;
  role: string;
  performance: number;
  sentiment: number;
  reviewCount: number;
  teamId: string;
  teamName?: string;
}

export interface EmployeeMetricsDTO {
  scatterData: EmployeeScatterPoint[];
  performanceDistribution: {
    range: string;
    count: number;
  }[];
  categorizedData: {
    [key: string]: EmployeeScatterPoint[];
  };
}
