declare module 'supercluster' {
  interface SuperclusterOptions<P = unknown> {
    radius?: number;
    maxZoom?: number;
    minZoom?: number;
    extent?: number;
    nodeSize?: number;
  }
  interface PointFeature<P = unknown> {
    type: 'Feature';
    id?: number;
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: P & { cluster?: boolean; point_count?: number; cluster_id?: number };
  }
  export default class Supercluster<P = unknown> {
    constructor(options?: SuperclusterOptions<P>);
    load(points: PointFeature<P>[]): this;
    getClusters(bbox: [number, number, number, number], zoom: number): PointFeature<P>[];
    getClusterExpansionZoom(clusterId: number): number;
  }
}
