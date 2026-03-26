import {
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  DollarSign,
  Calendar,
} from "lucide-react";

export interface PipelineStage {
  name: string;
  count: number;
  color: string;
  percentage?: number;
}

export interface PipelineMetrics {
  total_prospects: number;
  qualified_leads: number;
  conversion_rate: number;
  average_deal_size?: number;
  average_sales_cycle?: number; // in days
  stages: PipelineStage[];
}

interface PipelineViewProps {
  metrics?: PipelineMetrics;
  loading?: boolean;
}

export default function PipelineView({ metrics, loading }: PipelineViewProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Loading pipeline metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No pipeline data available</p>
      </div>
    );
  }

  const totalInPipeline = metrics.stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Prospects */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">
              Total Prospects
            </h3>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.total_prospects}
          </p>
        </div>

        {/* Qualified Leads */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">
              Qualified Leads
            </h3>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.qualified_leads}
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 font-semibold">
              Conversion Rate
            </h3>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(metrics.conversion_rate * 100).toFixed(1)}%
          </p>
        </div>

        {/* Average Deal Size */}
        {metrics.average_deal_size !== undefined && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-gray-600 font-semibold">
                Avg Deal Size
              </h3>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(metrics.average_deal_size / 1000).toFixed(0)}k
            </p>
          </div>
        )}

        {/* Sales Cycle */}
        {metrics.average_sales_cycle !== undefined && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-gray-600 font-semibold">
                Avg Sales Cycle
              </h3>
              <Calendar className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.average_sales_cycle} days
            </p>
          </div>
        )}
      </div>

      {/* Pipeline Visualization */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Sales Pipeline</h3>

        {/* Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {metrics.stages.map((stage) => {
            const stagePercentage = totalInPipeline > 0
              ? (stage.count / totalInPipeline) * 100
              : 0;

            return (
              <div key={stage.name} className="text-center">
                <div className={`rounded-lg p-4 ${stage.color} mb-3`}>
                  <p className="text-3xl font-bold text-white">
                    {stage.count}
                  </p>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {stage.name}
                </h4>
                <p className="text-xs text-gray-500">
                  {stagePercentage.toFixed(0)}% of pipeline
                </p>
              </div>
            );
          })}
        </div>

        {/* Pipeline Flow Visualization */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700">Pipeline Flow</h4>
          {metrics.stages.map((stage) => {
            const stagePercentage = totalInPipeline > 0
              ? (stage.count / totalInPipeline) * 100
              : 0;

            return (
              <div key={stage.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{stage.name}</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {stage.count} ({stagePercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${stage.color} transition-all`}
                    style={{ width: `${stagePercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Details Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Stage Details</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {metrics.stages.map((stage) => {
            const stagePercentage = totalInPipeline > 0
              ? (stage.count / totalInPipeline) * 100
              : 0;
            const nextStageIndex = metrics.stages.indexOf(stage) + 1;
            const nextStageCount = nextStageIndex < metrics.stages.length 
              ? metrics.stages[nextStageIndex].count 
              : 0;
            const conversionToNext = stage.count > 0
              ? (nextStageCount / stage.count) * 100
              : 0;

            return (
              <div key={stage.name} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${stage.color}`}
                    />
                    <span className="font-semibold text-gray-900">
                      {stage.name}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {stage.count}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">% of Pipe</p>
                    <p className="font-semibold text-gray-700">
                      {stagePercentage.toFixed(1)}%
                    </p>
                  </div>
                  {nextStageIndex < metrics.stages.length && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">
                        Convert to Next
                      </p>
                      <p className="font-semibold text-gray-700">
                        {conversionToNext.toFixed(1)}%
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Velocity</p>
                    <p className="font-semibold text-gray-700">
                      {(stage.count > 0 ? stage.count / 7 : 0).toFixed(1)}/week
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
