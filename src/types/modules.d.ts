declare module 'plotly.js-dist-min' {
  export interface PlotlyTrace {
    x?: number[];
    y?: number[];
    type?: string;
    mode?: string;
    name?: string;
    line?: {
      color?: string;
      width?: number;
      dash?: string;
    };
    marker?: {
      color?: string;
      size?: number;
      symbol?: string;
    };
    hovertemplate?: string;
    [key: string]: unknown;
  }

  export interface PlotlyLayout {
    [key: string]: unknown;
  }

  export interface PlotlyConfig {
    responsive?: boolean;
    displaylogo?: boolean;
    modeBarButtonsToRemove?: string[];
    [key: string]: unknown;
  }

  const Plotly: {
    newPlot: (root: HTMLElement, data: PlotlyTrace[], layout?: PlotlyLayout, config?: PlotlyConfig) => Promise<HTMLElement>;
    react: (root: HTMLElement, data: PlotlyTrace[], layout?: PlotlyLayout, config?: PlotlyConfig) => Promise<HTMLElement>;
    purge: (root: HTMLElement) => void;
    toImage: (root: HTMLElement, opts: { format: string; width?: number; height?: number }) => Promise<string>;
    Plots?: {
      resize: (root: HTMLElement) => Promise<HTMLElement> | void;
    };
  };

  export default Plotly;
}
