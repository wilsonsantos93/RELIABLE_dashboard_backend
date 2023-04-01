export type WeatherMetadata = {
    name: string;
    description: string;
    authRequired: boolean;
    main: boolean,
    ranges: {
        max: string | number;
        min: string | number;
        color: string;
        recommendations: string[];
    }[]
}