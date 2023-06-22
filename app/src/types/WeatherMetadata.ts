export type WeatherMetadata = {
    name: string;
    description: string;
    authRequired: boolean;
    viewOrder: number;
    main: boolean;
    active: boolean;
    ranges: {
        max: string | number;
        min: string | number;
        color: string;
        alert: boolean;
        recommendations: string[];
    }[]
}