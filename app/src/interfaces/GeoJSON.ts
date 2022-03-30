import {Feature} from "./GeoJSON/Feature";
import {FeatureGeometryMultiPolygon} from "./GeoJSON/Feature/FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureGeometryPolygon} from "./GeoJSON/Feature/FeatureGeometry/FeatureGeometryPolygon";
import {CRSLatLongProperties} from "./GeoJSON/CoordinatesReferenceSystem/CRSLatLongProperties";
import {CRSAnyProperties} from "./GeoJSON/CoordinatesReferenceSystem/CRSAnyProperties";
import {CoordinatesReferenceSystem} from "./GeoJSON/CoordinatesReferenceSystem";

export interface GeoJSON<TFeatureGeometry extends FeatureGeometryMultiPolygon | FeatureGeometryPolygon, TCRSProperties extends CRSAnyProperties | CRSLatLongProperties> {
    readonly type?: "FeatureCollection";
    readonly crs?: CoordinatesReferenceSystem<TCRSProperties>;
    readonly features: Feature<TFeatureGeometry>[];
}
