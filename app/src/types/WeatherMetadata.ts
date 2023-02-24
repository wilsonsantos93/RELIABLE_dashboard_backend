export type WeatherMetadata = {
    name: string;
    description: string;
    authRequired: boolean;
    colours: {
        max: string | number;
        min: string | number;
        colour: string;
    }[]
}