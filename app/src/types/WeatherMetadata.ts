export type WeatherMetadata = {
    name: string;
    description: string;
    authRequired: boolean;
    ranges: {
        max: string | number;
        min: string | number;
        color: string;
        recommendations: string[];
    }[]
}