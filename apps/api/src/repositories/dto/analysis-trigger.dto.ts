import { ArrayMinSize, IsArray, IsIn, IsString } from 'class-validator';

export const ANALYSIS_TYPES = ['dependency_graph', 'execution_flow', 'full_analysis'] as const;
export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

export class AnalysisTriggerDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(ANALYSIS_TYPES, { each: true })
  types!: AnalysisType[];
}
