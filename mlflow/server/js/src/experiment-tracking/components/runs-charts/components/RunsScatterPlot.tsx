import { useDesignSystemTheme } from '@databricks/design-system';
import { Data, Datum, Layout, PlotMouseEvent } from 'plotly.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LazyPlot } from '../../LazyPlot';
import { useMutableChartHoverCallback } from '../hooks/useMutableHoverCallback';
import { highlightScatterTraces, useRunsChartTraceHighlight } from '../hooks/useRunsChartTraceHighlight';
import {
  commonRunsChartStyles,
  RunsChartsRunData,
  RunsChartAxisDef,
  runsChartDefaultMargin,
  runsChartHoverlabel,
  RunsPlotsCommonProps,
  createThemedPlotlyLayout,
  useDynamicPlotSize,
  getLegendDataFromRuns,
} from './RunsCharts.common';
import { shouldEnableDeepLearningUI } from 'common/utils/FeatureUtils';
import RunsMetricsLegendWrapper from './RunsMetricsLegendWrapper';

export interface RunsScatterPlotProps extends RunsPlotsCommonProps {
  /**
   * Horizontal axis with a metric or a param
   */
  xAxis: RunsChartAxisDef;

  /**
   * Vertical axis with a metric or a param
   */
  yAxis: RunsChartAxisDef;

  /**
   * Array of runs data with corresponding values
   */
  runsData: RunsChartsRunData[];
}

const PLOT_CONFIG = {
  displaylogo: false,
  scrollZoom: false,
};

export const createTooltipTemplate = () =>
  '<b>%{customdata[1]}:</b><br>' +
  '<b>%{xaxis.title.text}:</b> %{x:.2f}<br>' +
  '<b>%{yaxis.title.text}:</b> %{y:.2f}<br>' +
  '<extra></extra>';

/**
 * Implementation of plotly.js chart displaying
 * scatter plot comparing values for a given
 * set of experiments runs
 */
export const RunsScatterPlot = React.memo(
  ({
    runsData,
    xAxis,
    yAxis,
    markerSize = 10,
    className,
    margin = runsChartDefaultMargin,
    onUpdate,
    onHover,
    onUnhover,
    width,
    height,
    useDefaultHoverBox = true,
    selectedRunUuid,
  }: RunsScatterPlotProps) => {
    const { theme } = useDesignSystemTheme();

    const usingV2ChartImprovements = shouldEnableDeepLearningUI();

    const { layoutHeight, layoutWidth, setContainerDiv, containerDiv, isDynamicSizeSupported } = useDynamicPlotSize();

    const plotData = useMemo(() => {
      // Prepare empty values
      const xValues: (number | string)[] = [];
      const yValues: (number | string)[] = [];
      const colors: (number | string)[] = [];
      const tooltipData: Datum[] = [];

      // Iterate through all the runs and aggregate selected metrics/params
      for (const runData of runsData) {
        const { runInfo, metrics, params, color, uuid, displayName } = runData;
        const { run_uuid, run_name } = runInfo || {};
        const xAxisData = xAxis.type === 'METRIC' ? metrics : params;
        const yAxisData = yAxis.type === 'METRIC' ? metrics : params;

        const x = xAxisData?.[xAxis.key]?.value || undefined;
        const y = yAxisData?.[yAxis.key]?.value || undefined;

        if (x && y) {
          xValues.push(x);
          yValues.push(y);
          colors.push(color || theme.colors.primary);
          if (run_uuid) {
            tooltipData.push([run_uuid, run_name || run_uuid] as any);
          } else {
            tooltipData.push([uuid, displayName] as any);
          }
        }
      }

      return [
        {
          x: xValues,
          y: yValues,
          customdata: tooltipData,
          hovertemplate: useDefaultHoverBox ? createTooltipTemplate() : undefined,
          hoverinfo: useDefaultHoverBox ? undefined : 'none',
          hoverlabel: useDefaultHoverBox ? runsChartHoverlabel : undefined,
          type: 'scatter',
          mode: 'markers',
          marker: {
            size: markerSize,
            color: colors,
          },
        } as Data,
      ];
    }, [runsData, xAxis, yAxis, theme, markerSize, useDefaultHoverBox]);

    const plotlyThemedLayout = useMemo(() => createThemedPlotlyLayout(theme), [theme]);

    const [layout, setLayout] = useState<Partial<Layout>>({
      width: width || layoutWidth,
      height: height || layoutHeight,
      margin,
      xaxis: { title: xAxis.key, tickfont: { size: 11, color: theme.colors.textSecondary } },
      yaxis: { title: yAxis.key, tickfont: { size: 11, color: theme.colors.textSecondary } },
      template: { layout: plotlyThemedLayout },
    });

    useEffect(() => {
      setLayout((current) => {
        const newLayout = {
          ...current,
          width: width || layoutWidth,
          height: height || layoutHeight,
          margin,
        };

        if (newLayout.xaxis) {
          newLayout.xaxis.title = xAxis.key;
        }

        if (newLayout.yaxis) {
          newLayout.yaxis.title = yAxis.key;
        }

        return newLayout;
      });
    }, [layoutWidth, layoutHeight, margin, xAxis.key, yAxis.key, width, height]);

    const { setHoveredPointIndex } = useRunsChartTraceHighlight(
      containerDiv,
      selectedRunUuid,
      runsData,
      highlightScatterTraces,
    );

    const hoverCallback = useCallback(
      ({ points }: PlotMouseEvent) => {
        // Find the corresponding run UUID by basing on "customdata" field set in the trace data.
        // Plotly TS typings don't support custom fields so we need to cast to "any" first
        const pointCustomDataRunUuid = (points[0] as any)?.customdata?.[0];
        setHoveredPointIndex(points[0]?.pointIndex ?? -1);

        if (pointCustomDataRunUuid) {
          onHover?.(pointCustomDataRunUuid);
        }
      },
      [onHover, setHoveredPointIndex],
    );

    const unhoverCallback = useCallback(() => {
      onUnhover?.();
      setHoveredPointIndex(-1);
    }, [onUnhover, setHoveredPointIndex]);

    /**
     * Unfortunately plotly.js memorizes first onHover callback given on initial render,
     * so in order to achieve updated behavior we need to wrap its most recent implementation
     * in the immutable callback.
     */
    const mutableHoverCallback = useMutableChartHoverCallback(hoverCallback);

    const legendLabelData = useMemo(() => getLegendDataFromRuns(runsData), [runsData]);

    const chart = (
      <div
        css={[commonRunsChartStyles.chartWrapper(theme), commonRunsChartStyles.scatterChartHighlightStyles]}
        className={className}
        ref={setContainerDiv}
      >
        <LazyPlot
          data={plotData}
          useResizeHandler={!isDynamicSizeSupported}
          css={commonRunsChartStyles.chart(theme)}
          layout={layout}
          config={PLOT_CONFIG}
          onUpdate={onUpdate}
          onHover={mutableHoverCallback}
          onUnhover={unhoverCallback}
        />
      </div>
    );

    return usingV2ChartImprovements ? (
      <RunsMetricsLegendWrapper labelData={legendLabelData}>{chart}</RunsMetricsLegendWrapper>
    ) : (
      chart
    );
  },
);
