import {CoordinatesReferenceSystem} from "./GeoJSON/CoordinatesReferenceSystem";
import {Feature} from "./GeoJSON/Feature";
import {FeatureGeometryMultiPolygon} from "./GeoJSON/Feature/FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureGeometryPolygon} from "./GeoJSON/Feature/FeatureGeometry/FeatureGeometryPolygon";

export interface GeoJSON<FeatureGeometry extends FeatureGeometryMultiPolygon | FeatureGeometryPolygon> {
    readonly type?: "FeatureCollection";
    readonly crs?: CoordinatesReferenceSystem;
    features: Feature<FeatureGeometry>[];
}

