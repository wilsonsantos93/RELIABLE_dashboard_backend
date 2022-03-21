import {FeatureGeometryMultiPolygon} from "./Feature/FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureProperties} from "./Feature/FeatureProperties";
import {FeatureGeometryPolygon} from "./Feature/FeatureGeometry/FeatureGeometryPolygon";
import {FeatureWeather} from "./Feature/FeatureWeather";

export interface Feature<TFeatureGeometry extends FeatureGeometryMultiPolygon | FeatureGeometryPolygon> {
    type?: "Feature";
    properties?: FeatureProperties;
    geometry?: TFeatureGeometry;
    weather?: FeatureWeather;
}